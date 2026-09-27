import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Bell, ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { logoutUser } from '../../../store/authSlice';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from './Topbar.module.css';

function Topbar({ user, theme, onToggleTheme, hasNotifications }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const name = user?.name?.trim() || 'Account';
  const initial = name.charAt(0).toUpperCase();

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

  return (
    <header className={styles.topbar}>
      <div className={styles.actions}>
        <div className={styles.themeToggle} role="group" aria-label="Colour theme">
          <button
            type="button"
            className={cx(styles.themeOption, theme === 'light' && styles.isSelected)}
            onClick={theme === 'light' ? undefined : onToggleTheme}
            aria-pressed={theme === 'light'}
          >
            <Sun size={16} aria-hidden="true" />
            <span className="u-visually-hidden">Light</span>
          </button>
          <button
            type="button"
            className={cx(styles.themeOption, theme === 'dark' && styles.isSelected)}
            onClick={theme === 'dark' ? undefined : onToggleTheme}
            aria-pressed={theme === 'dark'}
          >
            <Moon size={16} aria-hidden="true" />
            <span className="u-visually-hidden">Dark</span>
          </button>
        </div>

        <button type="button" className={styles.bell}>
          <Bell size={20} aria-hidden="true" />
          <span className="u-visually-hidden">
            {hasNotifications ? 'Notifications, unread' : 'Notifications'}
          </span>
          {hasNotifications && <span className={styles.dot} aria-hidden="true" />}
        </button>

        <div className={styles.profileWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.profile}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className={styles.avatar} aria-hidden="true">
              {initial}
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
      </div>
    </header>
  );
}

export default Topbar;
