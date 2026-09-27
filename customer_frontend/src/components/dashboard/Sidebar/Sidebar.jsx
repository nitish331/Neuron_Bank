import { NavLink } from 'react-router-dom';
import { ChevronsLeft } from 'lucide-react';
import Logo from '../../common/Logo/Logo';
import { DASHBOARD_NAV } from '../../../constants/dashboardNav';
import cx from '../../../utils/classNames';
import styles from './Sidebar.module.css';

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={cx(styles.sidebar, collapsed && styles.isCollapsed)}>
      <div className={styles.brand}>
        <Logo variant={collapsed ? 'mark' : 'horizontal'} />
      </div>

      <nav className={styles.nav} aria-label="Dashboard">
        {DASHBOARD_NAV.map(({ id, label, to, icon: Icon, end }) => (
          <NavLink
            key={id}
            to={to}
            end={end}
            className={({ isActive }) => cx(styles.link, isActive && styles.isActive)}
            title={collapsed ? label : undefined}
          >
            <Icon className={styles.linkIcon} size={20} aria-hidden="true" />
            <span className={styles.linkLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className={styles.collapse} onClick={onToggle}>
        <ChevronsLeft className={styles.collapseIcon} size={18} aria-hidden="true" />
        <span className={styles.linkLabel}>Collapse</span>
      </button>
    </aside>
  );
}

export default Sidebar;
