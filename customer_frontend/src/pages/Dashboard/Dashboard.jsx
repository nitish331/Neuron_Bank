import { useSelector } from 'react-redux';
import BalanceCard from './sections/BalanceCard';
import SummaryTiles from './sections/SummaryTiles';
import CashflowChart from './sections/CashflowChart';
import SpendingChart from './sections/SpendingChart';
import RecentTransactions from './sections/RecentTransactions';
import { WealthPromo } from './sections/SidePanels';
import { useThemeContext } from '../../context/ThemeContext';
import { selectUser } from '../../store/authSlice';
import { greeting } from '../../utils/format';
import styles from './Dashboard.module.css';

function Dashboard() {
  const { theme } = useThemeContext();
  const user = useSelector(selectUser);

  // Only the identity is real so far; the figures stay dummy until the
  // transaction endpoints are wired up.
  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  return (
    <div className={styles.page}>
      <header className={styles.greeting}>
        <div>
          <h1 className={styles.greetingTitle}>
            {greeting()}, <span className="u-gradient-text">{firstName}</span>{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className={styles.greetingText}>
            Here&apos;s your financial overview for today.
          </p>
        </div>

        <p className={styles.quote}>
          &ldquo;Better money habits,
          <br />a brighter tomorrow.&rdquo;
        </p>
      </header>

      <BalanceCard />
      <SummaryTiles />

      <div className={styles.grid}>
        <CashflowChart theme={theme} />
        <SpendingChart theme={theme} />
        <RecentTransactions />
        <div className={styles.side}>
          <WealthPromo />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
