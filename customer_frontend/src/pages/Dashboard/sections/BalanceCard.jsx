import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Eye, EyeOff, Plus, Send } from 'lucide-react';
import { selectUser } from '../../../store/authSlice';
import { selectAccountSummary } from '../../../store/accountSlice';
import { selectAnalyticsBalance } from '../../../store/analyticsSlice';
import { splitAmount } from '../../../utils/format';
import AddMoneyModal from './AddMoneyModal';
import styles from '../Dashboard.module.css';

/** Shows only the last four digits of a real account number. */
function maskNumber(accountNumber) {
  return accountNumber ? `**** ${String(accountNumber).slice(-4)}` : null;
}

function BalanceCard() {
  const user = useSelector(selectUser);
  const account = useSelector(selectAccountSummary);
  const analyticsBalance = useSelector(selectAnalyticsBalance);
  const [hidden, setHidden] = useState(false);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);

  // Freshest first: analytics, then the transactions response, then login.
  const balance = analyticsBalance ?? account.balance ?? user?.balance ?? 0;
  const maskedNumber = maskNumber(account.accountNumber ?? user?.accountNumber);
  const { whole, fraction } = splitAmount(balance);

  return (
    <section className={styles.balance}>
      <div>
        <p className={styles.balanceLabel}>
          Total Balance
          <button
            type="button"
            className={styles.balanceEye}
            onClick={() => setHidden((v) => !v)}
          >
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            <span className="u-visually-hidden">
              {hidden ? 'Show balance' : 'Hide balance'}
            </span>
          </button>
        </p>

        <p className={styles.balanceAmount}>
          <span className={styles.balanceSymbol}>₹</span>
          {hidden ? (
            <span aria-label="Balance hidden">••••••</span>
          ) : (
            <>
              {whole}
              <span className={styles.balanceFraction}>.{fraction}</span>
            </>
          )}
        </p>

        {maskedNumber && (
          <p className={styles.balanceMeta}>Account {maskedNumber}</p>
        )}
      </div>

      <div className={styles.balanceActions}>
        <button
          type="button"
          className={styles.actionPrimary}
          onClick={() => setAddMoneyOpen(true)}
        >
          <span className={styles.actionIcon} aria-hidden="true">
            <Plus size={18} />
          </span>
          Add Money
        </button>
        <button type="button" className={styles.actionGhost}>
          <Send size={18} aria-hidden="true" />
          Send Money
        </button>
      </div>

      <AddMoneyModal open={addMoneyOpen} onClose={() => setAddMoneyOpen(false)} />
    </section>
  );
}

export default BalanceCard;
