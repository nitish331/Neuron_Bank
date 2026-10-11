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
import NotAdmin from '../pages/NotAdmin/NotAdmin';
import { ROUTES } from './paths';
import styles from './ProtectedRoute.module.css';

/**
 * UX gate only — every /admin endpoint is already behind requireRole("admin"),
 * so a customer who forces their way here still gets a 403 from the server.
 */
function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const accessToken = useSelector(selectAccessToken);
  const user = useSelector(selectUser);

  // Decided once on mount: a succeeding refresh writes the new token back into
  // the store, which would otherwise cancel this effect before it finished.
  const [refreshing, setRefreshing] = useState(
    () => isAuthenticated && isTokenExpired(accessToken),
  );

  useEffect(() => {
    if (!refreshing) return;

    refreshSession().then((ok) => {
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

  // A signed-in customer is authenticated but has no business being here.
  if (user?.role !== 'admin') return <NotAdmin />;

  return <Outlet />;
}

export default ProtectedRoute;
