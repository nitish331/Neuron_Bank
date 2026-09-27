import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectAccessToken,
  selectIsAuthenticated,
  selectUser,
} from '../store/authSlice';
import { refreshSession, SESSION_EXPIRED_EVENT } from '../services/apiClient';
import { isTokenExpired } from '../utils/jwt';
import { accessState } from '../utils/accountAccess';
import AccountStatus from '../pages/AccountStatus/AccountStatus';
import { ROUTES } from './paths';
import styles from './ProtectedRoute.module.css';

/** UX gate only — the backend still has to enforce the same rules. */
function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const user = useSelector(selectUser);

  // After 15 idle minutes the first render's calls would all 401, so refresh
  // once up front instead of letting each one fail and retry. Decided once on
  // mount: a succeeding refresh writes the new token straight back into the
  // store, so a live `isTokenExpired(accessToken)` check would flip to false
  // and cancel this effect before its own callback ran.
  const [refreshing, setRefreshing] = useState(
    () => isAuthenticated && isTokenExpired(accessToken),
  );

  useEffect(() => {
    if (!refreshing) return;

    refreshSession().then((ok) => {
      // A dead refresh token here means every later call would 401 anyway.
      if (!ok) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      setRefreshing(false);
    });
  }, [refreshing]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (refreshing) {
    return (
      <div className={styles.booting}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>Restoring your session…</p>
      </div>
    );
  }

  // Signed in but not cleared yet: say why rather than bouncing them silently.
  const state = accessState(user);
  if (state) return <AccountStatus state={state} />;

  return <Outlet />;
}

export default ProtectedRoute;
