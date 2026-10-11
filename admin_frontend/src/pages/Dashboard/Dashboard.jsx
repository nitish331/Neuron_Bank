import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { loadAccounts, selectStatusCounts } from '../../store/accountsSlice';
import { selectUser } from '../../store/authSlice';
import { ROUTES } from '../../routes/paths';
import cx from '../../utils/classNames';
import styles from './Dashboard.module.css';

function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const counts = useSelector(selectStatusCounts);

  // The counts come back with any account page, so the cheapest one will do.
  useEffect(() => {
    dispatch(loadAccounts({ status: 'pending', page: 1 }));
  }, [dispatch]);

  const tiles = [
    {
      id: 'pending',
      label: 'Awaiting review',
      value: counts?.pending ?? 0,
      icon: Clock,
      tone: styles.tileAmber,
    },
    {
      id: 'active',
      label: 'Approved accounts',
      value: counts?.active ?? 0,
      icon: CheckCircle2,
      tone: styles.tileGreen,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      value: counts?.rejected ?? 0,
      icon: XCircle,
      tone: styles.tileRed,
    },
    {
      id: 'total',
      label: 'Total accounts',
      value: counts
        ? Object.values(counts).reduce((sum, count) => sum + count, 0)
        : 0,
      icon: Users,
      tone: styles.tileViolet,
    },
  ];

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className={styles.subtitle}>
          Here is where the Neuron Bank queues stand right now.
        </p>
      </header>

      <section className={styles.tiles}>
        {tiles.map(({ id, label, value, icon: Icon, tone }) => (
          <article key={id} className={styles.tile}>
            <span className={cx(styles.tileIcon, tone)} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div>
              <p className={styles.tileValue}>{value}</p>
              <p className={styles.tileLabel}>{label}</p>
            </div>
          </article>
        ))}
      </section>

      {counts?.pending > 0 && (
        <section className={styles.callout}>
          <div>
            <h2 className={styles.calloutTitle}>
              {counts.pending} account{counts.pending === 1 ? '' : 's'} waiting
            </h2>
            <p className={styles.calloutText}>
              Customers cannot bank until their account is approved.
            </p>
          </div>
          <Link to={ROUTES.approvals} className={styles.calloutAction}>
            Review now
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
