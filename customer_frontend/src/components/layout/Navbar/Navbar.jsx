import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../common/Button/Button';
import Container from '../../common/Container/Container';
import Logo from '../../common/Logo/Logo';
import { ArrowRightIcon, CloseIcon, MenuIcon } from '../../common/Icon/Icon';
import { PRIMARY_NAV } from '../../../constants/navigation';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from './Navbar.module.css';

/** Sentinel meaning "back to the top", rather than a real element id. */
const TOP = 'top';

function scrollToSection(sectionId) {
  if (sectionId === TOP) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  // Smoothness comes from `scroll-behavior` on <html>; each section's
  // scroll-margin-top keeps its heading clear of this sticky bar.
  document.getElementById(sectionId)?.scrollIntoView();
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Set when a section is picked from another route: we must land on the
  // homepage before the target element exists to scroll to.
  const [pendingSection, setPendingSection] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === ROUTES.home;

  // Solidify the bar once the hero starts scrolling under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Any navigation closes the mobile sheet.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Don't let the page scroll behind the open sheet.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // We've arrived on the homepage from elsewhere — the section exists now.
  useEffect(() => {
    if (!pendingSection || !isHome) return;
    scrollToSection(pendingSection);
    setPendingSection(null);
  }, [pendingSection, isHome]);

  const handleSectionClick = (event, sectionId) => {
    event.preventDefault();
    setMenuOpen(false);

    if (isHome) {
      scrollToSection(sectionId);
      return;
    }

    setPendingSection(sectionId);
    navigate(ROUTES.home);
  };

  // Investments and Support are real routes; the rest scroll the homepage.
  const renderNavItem = (item, className) =>
    item.sectionId ? (
      <Link
        key={item.label}
        to={`${ROUTES.home}#${item.sectionId}`}
        onClick={(event) => handleSectionClick(event, item.sectionId)}
        className={className}
      >
        {item.label}
      </Link>
    ) : (
      <NavLink
        key={item.label}
        to={item.to}
        className={({ isActive }) =>
          cx(className, isActive && styles.navbarLinkActive)
        }
      >
        {item.label}
      </NavLink>
    );

  return (
    <header className={cx(styles.navbar, scrolled && styles.navbarScrolled)}>
      <Container className={styles.navbarInner}>
        <Logo variant="horizontal" />

        <nav className={styles.navbarLinks} aria-label="Primary">
          {PRIMARY_NAV.map((item) => renderNavItem(item, styles.navbarLink))}
        </nav>

        <div className={styles.navbarActions}>
          <Button variant="ghost" size="md" to={ROUTES.login}>
            Login
          </Button>
          <Button variant="primary" size="md" to={ROUTES.register}>
            Get Started
            <ArrowRightIcon />
          </Button>
        </div>

        <button
          className={styles.navbarToggle}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </Container>

      {menuOpen && (
        <div className={cx(styles.navbarSheet, 'u-glass')}>
          <nav aria-label="Mobile">
            {PRIMARY_NAV.map((item) => renderNavItem(item, styles.navbarSheetLink))}
          </nav>
          <div className={styles.navbarSheetActions}>
            <Button variant="ghost" size="lg" to={ROUTES.login}>
              Login
            </Button>
            <Button variant="primary" size="lg" to={ROUTES.register}>
              Get Started
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
