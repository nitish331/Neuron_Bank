import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { accessTokenRefreshed } from '../store/authSlice';
import { TOKEN_REFRESHED_EVENT } from '../services/apiClient';
import ProtectedRoute from './ProtectedRoute';

// react-router v7's exports map does not resolve under CRA's Jest, and this
// suite is about the admin gate rather than routing.
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div>REDIRECT {to}</div>,
  Outlet: () => <div>ADMIN PANEL</div>,
  Link: ({ children }) => <span>{children}</span>,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => jest.fn(),
}));

function token(offsetSeconds) {
  const exp = Math.floor(Date.now() / 1000) + offsetSeconds;
  return `x.${btoa(JSON.stringify({ exp }))}.y`;
}

function makeStore(auth) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth },
  });
}

function renderGuard(store) {
  return render(
    <Provider store={store}>
      <ProtectedRoute />
    </Provider>,
  );
}

const LIVE = { accessToken: token(900), refreshToken: 'live-refresh-token' };

beforeEach(() => {
  window.localStorage.clear();
});

test('an admin reaches the panel', () => {
  renderGuard(makeStore({ ...LIVE, user: { role: 'admin', email: 'a@n.com' } }));

  expect(screen.getByText('ADMIN PANEL')).toBeInTheDocument();
});

test('a signed-in customer is refused, not shown the panel', () => {
  renderGuard(makeStore({ ...LIVE, user: { role: 'customer', email: 'c@n.com' } }));

  expect(screen.queryByText('ADMIN PANEL')).not.toBeInTheDocument();
  expect(screen.getByText(/admin access only/i)).toBeInTheDocument();
});

test('a user with no role at all is refused', () => {
  renderGuard(makeStore({ ...LIVE, user: { email: 'x@n.com' } }));

  expect(screen.queryByText('ADMIN PANEL')).not.toBeInTheDocument();
  expect(screen.getByText(/admin access only/i)).toBeInTheDocument();
});

test('no session redirects to login', () => {
  renderGuard(makeStore({ user: null, accessToken: null, refreshToken: null }));

  expect(screen.getByText(/REDIRECT/)).toBeInTheDocument();
});

test('an expired access token refreshes before the panel renders', async () => {
  const store = makeStore({
    user: { role: 'admin', email: 'a@n.com' },
    accessToken: token(-60),
    refreshToken: 'live-refresh-token',
  });
  window.localStorage.setItem('neuron.refreshToken', 'live-refresh-token');

  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ success: true, token: token(900) }),
  }));

  const onRefreshed = (event) => store.dispatch(accessTokenRefreshed(event.detail));
  window.addEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);

  renderGuard(store);
  expect(screen.getByText(/restoring your session/i)).toBeInTheDocument();

  await waitFor(() => expect(screen.getByText('ADMIN PANEL')).toBeInTheDocument());

  window.removeEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);
});
