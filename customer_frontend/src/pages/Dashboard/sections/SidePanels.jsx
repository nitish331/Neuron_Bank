import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesColumn } from 'lucide-react';
import { ROUTES } from '../../../routes/paths';
import styles from '../Dashboard.module.css';

export function WealthPromo() {
  return (
    <section className={styles.promo}>
      <span className={styles.promoIcon} aria-hidden="true">
        <ChartNoAxesColumn size={24} />
      </span>
      <h2 className={styles.promoTitle}>Grow Your Wealth</h2>
      <p className={styles.promoText}>
        Explore investment options tailored for your goals.
      </p>
      <Link to={ROUTES.dashboardInvestments} className={styles.promoAction}>
        Explore Investments
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
