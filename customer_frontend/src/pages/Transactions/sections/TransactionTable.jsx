import { useSelector } from 'react-redux';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import {
  selectError,
  selectItems,
  selectPagination,
  selectStatus,
} from '../../../store/transactionsSlice';
import { formatCurrency } from '../../../utils/format';
import cx from '../../../utils/classNames';
import styles from '../Transactions.module.css';

const DATE = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
});

/** The API has no category field, so name the movement instead. */
function kindOf({ senderAccountNumber, receiverAccountNumber, type }) {
  if (senderAccountNumber === receiverAccountNumber) return 'Self deposit';
  return type === 'credit' ? 'Transfer in' : 'Transfer out';
}

function counterparty({ senderAccountNumber, receiverAccountNumber, type }) {
  if (senderAccountNumber === receiverAccountNumber) return 'Own account';

  const other = type === 'credit' ? senderAccountNumber : receiverAccountNumber;
  if (!other) return '—';

  return `${type === 'credit' ? 'From' : 'To'} ····${String(other).slice(-4)}`;
}

function TransactionTable() {
  const items = useSelector(selectItems);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);

  const isFirstLoad = status === 'pending' && items.length === 0;

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>
          Transaction History
          {pagination?.total ? (
            <span className={styles.count}>({pagination.total})</span>
          ) : null}
        </h2>
      </header>

      {isFirstLoad && (
        <ul className={styles.skeletonList} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className={styles.skeletonRow} />
          ))}
        </ul>
      )}

      {!isFirstLoad && status === 'failed' && (
        <p className={styles.tableError} role="alert">
          {error?.message || 'Could not load your transactions.'}
        </p>
      )}

      {!isFirstLoad && status !== 'failed' && items.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Receipt size={22} />
          </span>
          <p>No transactions found.</p>
          <p className={styles.emptyHint}>
            Try widening the date range or clearing the filters.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className={cx(styles.tableWrap, status === 'pending' && styles.isStale)}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Account</th>
                <th scope="col">Type</th>
                <th scope="col" className={styles.alignRight}>
                  Amount
                </th>
                <th scope="col" className={styles.alignRight}>
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((transaction) => {
                const isCredit = transaction.type === 'credit';
                const when = new Date(transaction.dateTime);

                return (
                  <tr key={transaction.id || transaction.reference}>
                    <td className={styles.cellDate}>
                      <span>{DATE.format(when)}</span>
                      <span className={styles.cellTime}>{TIME.format(when)}</span>
                    </td>

                    <td className={styles.cellDescription}>
                      <span
                        className={styles.description}
                        title={transaction.description || undefined}
                      >
                        {transaction.description ||
                          (isCredit ? 'Money added' : 'Payment')}
                      </span>
                      <span className={styles.reference}>
                        {kindOf(transaction)} · {transaction.reference}
                      </span>
                    </td>

                    <td className={styles.cellMuted}>{counterparty(transaction)}</td>

                    <td>
                      <span
                        className={cx(
                          styles.badge,
                          isCredit ? styles.badgeCredit : styles.badgeDebit,
                        )}
                      >
                        {isCredit ? (
                          <ArrowDownLeft size={13} aria-hidden="true" />
                        ) : (
                          <ArrowUpRight size={13} aria-hidden="true" />
                        )}
                        {isCredit ? 'Credit' : 'Debit'}
                      </span>
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

                    <td className={cx(styles.alignRight, styles.cellBalance)}>
                      {formatCurrency(transaction.balanceAfter)}
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

export default TransactionTable;
