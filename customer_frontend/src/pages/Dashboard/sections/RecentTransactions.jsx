import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, Receipt } from 'lucide-react';
import {
  selectAccountSummary,
  selectTransactions,
  selectTransactionsError,
  selectTransactionsStatus,
} from '../../../store/accountSlice';
import { formatCurrency, formatDate } from '../../../utils/format';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from '../Dashboard.module.css';

const ROW_COUNT = 5;

/** The API has no category field yet, so show the counterparty instead. */
function counterparty(transaction, ownAccount) {
  const { senderAccountNumber, receiverAccountNumber, type } = transaction;

  if (senderAccountNumber === receiverAccountNumber) return 'Self deposit';

  const other = type === 'credit' ? senderAccountNumber : receiverAccountNumber;
  if (!other) return type === 'credit' ? 'Credit' : 'Debit';
  if (other === ownAccount) return 'Own account';

  return `${type === 'credit' ? 'From' : 'To'} ····${String(other).slice(-4)}`;
}

function describe(transaction) {
  if (transaction.description) return transaction.description;
  return transaction.type === 'credit' ? 'Money added' : 'Payment';
}

function RecentTransactions() {
  const transactions = useSelector(selectTransactions);
  const status = useSelector(selectTransactionsStatus);
  const error = useSelector(selectTransactionsError);
  const { accountNumber } = useSelector(selectAccountSummary);

  const rows = transactions.slice(0, ROW_COUNT);
  const isLoading = status === 'pending' && transactions.length === 0;

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Recent Transactions</h2>
        <Link to={ROUTES.dashboardTransactions} className={styles.viewAll}>
          View All
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>

      {isLoading && (
        <ul className={styles.skeletonList} aria-hidden="true">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <li key={index} className={styles.skeletonRow} />
          ))}
        </ul>
      )}

      {!isLoading && status === 'failed' && (
        <p className={styles.tableError} role="alert">
          {error?.message || 'Could not load your transactions.'}
        </p>
      )}

      {!isLoading && status !== 'failed' && rows.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Receipt size={22} />
          </span>
          <p>No transactions yet.</p>
          <p className={styles.emptyHint}>
            Add money to your account to see it here.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Account</th>
                <th scope="col" className={styles.alignRight}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction) => {
                const isCredit = transaction.type === 'credit';
                const label = describe(transaction);

                return (
                  <tr key={transaction.id || transaction.reference}>
                    <td className={styles.cellDate}>
                      {formatDate(transaction.dateTime)}
                    </td>
                    <td className={styles.cellDescription} title={label}>
                      {label}
                    </td>
                    <td className={styles.cellCategory}>
                      {counterparty(transaction, accountNumber)}
                    </td>
                    <td
                      className={cx(
                        styles.alignRight,
                        styles.cellAmount,
                        isCredit ? styles.amountIn : styles.amountOut,
                      )}
                    >
                      {isCredit ? '+' : '−'} {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecentTransactions;
