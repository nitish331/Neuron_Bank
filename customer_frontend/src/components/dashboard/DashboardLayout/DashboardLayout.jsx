import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadTransactions } from '../../../store/accountSlice';
import { loadAnalytics } from '../../../store/analyticsSlice';
import Sidebar from '../Sidebar/Sidebar';
import Topbar from '../Topbar/Topbar';
import { useThemeContext } from '../../../context/ThemeContext';
import { selectUser } from '../../../store/authSlice';
import styles from './DashboardLayout.module.css';

function DashboardLayout() {
  const { theme, toggleTheme } = useThemeContext();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [collapsed, setCollapsed] = useState(false);

  // The layout outlives route changes, so this runs once per dashboard visit.
  // Analytics are aggregated server-side; the list only feeds the recent rows.
  useEffect(() => {
    dispatch(loadAnalytics());
    dispatch(loadTransactions({ page: 1, limit: 5 }));
  }, [dispatch]);

  return (
    // data-theme scopes the light/dark tokens to the dashboard only.
    <div className={styles.shell} data-theme={theme}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className={styles.main}>
        <Topbar
          user={user}
          theme={theme}
          onToggleTheme={toggleTheme}
          hasNotifications
        />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
