import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { accessTokenRefreshed } from '../store/authSlice';
import accountReducer from '../store/accountSlice';
import { TOKEN_REFRESHED_EVENT } from '../services/apiClient';
import ProtectedRoute from './ProtectedRoute';

// react-router v7's exports map does not resolve under CRA's Jest, and this
// suite is about the restore gate rather than routing.
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div>REDIRECT {to}</div>,
  Outlet: () => <div>DASHBOARD</div>,
  Link: ({ children }) => <span>{children}</span>,
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => jest.fn(),
}));

/** A JWT whose exp is `offsetSeconds` from now. The signature is never read. */
function token(offsetSeconds) {
  const exp = Math.floor(Date.now() / 1000) + offsetSeconds;
  return `x.${btoa(JSON.stringify({ exp }))}.y`;
}

function makeStore(auth) {
  return configureStore({
    reducer: { auth: authReducer, account: accountReducer },
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

const ACTIVE_USER = { name: 'Nitish', status: 'active', accountStatus: 'active' };

beforeEach(() => {
  window.localStorage.clear();
});

test('the restore spinner clears once the refresh resolves', async () => {
  const store = makeStore({
    user: ACTIVE_USER,
    accessToken: token(-60), // already expired
    refreshToken: 'live-refresh-token',
  });
  window.localStorage.setItem('neuron.refreshToken', 'live-refresh-token');

  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ success: true, token: token(900) }),
  }));

  // Mirrors AuthProvider: the new token lands in the store synchronously,
  // which used to cancel the effect before its own callback ran.
  const onRefreshed = (event) => store.dispatch(accessTokenRefreshed(event.detail));
  window.addEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);

  renderGuard(store);
  expect(screen.getByText(/restoring your session/i)).toBeInTheDocument();

  await waitFor(() => expect(screen.getByText('DASHBOARD')).toBeInTheDocument());
  expect(screen.queryByText(/restoring your session/i)).not.toBeInTheDocument();

  window.removeEventListener(TOKEN_REFRESHED_EVENT, onRefreshed);
});

test('a fresh access token renders straight through with no spinner', () => {
  const store = makeStore({
    user: ACTIVE_USER,
    accessToken: token(900),
    refreshToken: 'live-refresh-token',
  });

  renderGuard(store);

  expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  expect(screen.queryByText(/restoring your session/i)).not.toBeInTheDocument();
});

test('no refresh token redirects to login', () => {
  const store = makeStore({ user: null, accessToken: null, refreshToken: null });

  renderGuard(store);

  expect(screen.getByText(/REDIRECT/)).toBeInTheDocument();
});
