import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useStore } from 'react-redux';
import {
  SESSION_EXPIRED_EVENT,
  TOKEN_REFRESHED_EVENT,
} from '../services/apiClient';
import { accessTokenRefreshed, sessionEnded } from '../store/authSlice';
import { ROUTES } from '../routes/paths';

/** Bridges the API client's session events into the store and the router. */
function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useStore();

  useEffect(() => {
    const handleExpired = () => {
      // Parallel 401s can emit more than once; the first clears the session
      // and the rest fall through here as no-ops.
      if (!store.getState().auth.refreshToken) return;

      dispatch(sessionEnded());
      navigate(ROUTES.login, { replace: true, state: { reason: 'expired' } });
    };

    const handleRefreshed = (event) => {
      dispatch(accessTokenRefreshed(event.detail));
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    window.addEventListener(TOKEN_REFRESHED_EVENT, handleRefreshed);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      window.removeEventListener(TOKEN_REFRESHED_EVENT, handleRefreshed);
    };
  }, [dispatch, navigate, store]);

  return children;
}

export default AuthProvider;
