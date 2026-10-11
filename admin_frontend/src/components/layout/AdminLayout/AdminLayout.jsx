import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronDown, LogOut, ShieldCheck } from 'lucide-react';
import Logo from '../../common/Logo/Logo';
import { ADMIN_NAV } from '../../../constants/adminNav';
import { logoutUser, selectUser } from '../../../store/authSlice';
import { selectStatusCounts } from '../../../store/accountsSlice';
import { selectLoanCounts } from '../../../store/loansSlice';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from './AdminLayout.module.css';

function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const accountCounts = useSelector(selectStatusCounts);
  const loanCounts = useSelector(selectLoanCounts);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleSignOut = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.login, { replace: true });
  };

  const name = user?.name?.trim() || 'Admin';

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo variant="horizontal" linked={false} />
        </div>

        <nav className={styles.nav} aria-label="Admin">
          {ADMIN_NAV.map(({ id, label, to, icon: Icon, end, badge, source }) => {
            const counts = source === 'loans' ? loanCounts : accountCounts;

            return (
              <NavLink
                key={id}
                to={to}
                end={end}
                className={({ isActive }) => cx(styles.link, isActive && styles.isActive)}
              >
                <Icon size={20} aria-hidden="true" />
                <span className={styles.linkLabel}>{label}</span>
                {/* Only shown once the count is known and non-zero. */}
                {badge && counts?.[badge] > 0 && (
                  <span className={styles.badge}>{counts[badge]}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.role}>
            <ShieldCheck size={14} aria-hidden="true" />
            Admin
          </span>

          <div className={styles.profileWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.profile}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className={styles.avatar} aria-hidden="true">
                {name.charAt(0).toUpperCase()}
              </span>
              <span className={styles.profileName}>{name}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className={styles.menu} role="menu">
                <div className={styles.menuHead}>
                  <strong>{name}</strong>
                  {user?.email && <span>{user.email}</span>}
                </div>
                <button
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
