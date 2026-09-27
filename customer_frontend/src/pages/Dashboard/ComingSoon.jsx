import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { DASHBOARD_NAV } from '../../constants/dashboardNav';
import styles from './ComingSoon.module.css';

function ComingSoon() {
  const { pathname } = useLocation();
  const item = DASHBOARD_NAV.find((entry) => entry.to === pathname);

  return (
    <section className={styles.comingSoon}>
      <span className={styles.icon} aria-hidden="true">
        <Construction size={26} />
      </span>
      <h1 className={styles.title}>{item?.label || 'This section'}</h1>
      <p className={styles.text}>
        This screen has not been built yet. It will land here once its design is
        ready.
      </p>
    </section>
  );
}

export default ComingSoon;
