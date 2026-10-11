import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Download, Landmark, Mail } from 'lucide-react';
import TransactionFilters from './sections/TransactionFilters';
import TransactionTable from './sections/TransactionTable';
import {
  loadPage,
  PAGE_SIZE,
  selectApplied,
  selectPagination,
  selectStatus,
  selectSummary,
} from '../../store/transactionsSlice';
import {
  downloadStatement,
  emailStatement,
} from '../../services/account.service';
import { ApiError } from '../../services/apiClient';
import { selectUser } from '../../store/authSlice';
import { splitAmount } from '../../utils/format';
import styles from './Transactions.module.css';

function maskNumber(accountNumber) {
  return accountNumber ? `**** ${String(accountNumber).slice(-4)}` : null;
}

function Transactions() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const summary = useSelector(selectSummary);
  const pagination = useSelector(selectPagination);
  const status = useSelector(selectStatus);
  const applied = useSelector(selectApplied);

  const [exportState, setExportState] = useState({ busy: '', notice: '', failed: false });

  useEffect(() => {
    dispatch(loadPage({ page: 1 }));
  }, [dispatch]);

  const balance = summary.balance ?? user?.balance ?? 0;
  const { whole, fraction } = splitAmount(balance);
  const masked = maskNumber(summary.accountNumber ?? user?.accountNumber);

  const page = pagination?.page ?? 1;
  const total = pagination?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const isBusy = status === 'pending';

  const goToPage = (next) => dispatch(loadPage({ page: next }));

  const describeError = (error) =>
    error instanceof ApiError
      ? error.message
      : 'Something went wrong. Please try again.';

  const handleDownload = async () => {
    setExportState({ busy: 'pdf', notice: '', failed: false });

    try {
      const { blob, filename } = await downloadStatement(applied);

      // A blob URL plus a synthetic click is the only way to name a download.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'neuron-bank-statement.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setExportState({ busy: '', notice: 'Your statement has downloaded.', failed: false });
    } catch (error) {
      setExportState({ busy: '', notice: describeError(error), failed: true });
    }
  };

  const handleEmail = async () => {
    setExportState({ busy: 'email', notice: '', failed: false });

    try {
      const response = await emailStatement(applied);
      setExportState({
        busy: '',
        notice: response?.message || 'Statement sent to your email.',
        failed: false,
      });
    } catch (error) {
      setExportState({ busy: '', notice: describeError(error), failed: true });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>
            View and manage all your account transactions.
          </p>
        </div>
        <p className={styles.quote}>
          &ldquo;Clear history.
          <br />
          Brighter decisions.&rdquo;
        </p>
      </header>

      <div className={styles.accountRow}>
        <section className={styles.account}>
          <span className={styles.accountIcon} aria-hidden="true">
            <Landmark size={22} />
          </span>

          <div className={styles.accountMeta}>
            <p className={styles.accountName}>Account</p>
            {masked && <p className={styles.accountNumber}>{masked}</p>}
          </div>

          <div className={styles.accountBalance}>
            <p className={styles.accountBalanceLabel}>Available Balance</p>
            <p className={styles.accountBalanceValue}>
              <span className={styles.currency}>₹</span>
              {whole}
              <span className={styles.fraction}>.{fraction}</span>
            </p>
          </div>
        </section>

        <div className={styles.exports}>
          <button
            type="button"
            className={styles.exportGhost}
            onClick={handleEmail}
            disabled={Boolean(exportState.busy) || total === 0}
          >
            <Mail size={18} aria-hidden="true" />
            {exportState.busy === 'email' ? 'Sending…' : 'Send to Email'}
          </button>
          <button
            type="button"
            className={styles.exportPrimary}
            onClick={handleDownload}
            disabled={Boolean(exportState.busy) || total === 0}
          >
            <Download size={18} aria-hidden="true" />
            {exportState.busy === 'pdf' ? 'Preparing…' : 'Download as PDF'}
          </button>
        </div>
      </div>

      {exportState.notice && (
        <p
          className={exportState.failed ? styles.exportError : styles.exportNote}
          role="status"
        >
          {exportState.notice}
        </p>
      )}

      <TransactionFilters />

      <TransactionTable />

      {total > 0 && (
        <nav className={styles.pager} aria-label="Transaction pages">
          <p className={styles.pagerCount}>
            Showing {first}&ndash;{last} of {total} transactions
          </p>

          <div className={styles.pagerControls}>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isBusy}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span className="u-visually-hidden">Previous page</span>
            </button>

            <span className={styles.pagerPage}>
              {page} / {pagination?.totalPages ?? 1}
            </span>

            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => goToPage(page + 1)}
              disabled={!pagination?.hasMore || isBusy}
            >
              <ArrowRight size={16} aria-hidden="true" />
              <span className="u-visually-hidden">Next page</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default Transactions;
