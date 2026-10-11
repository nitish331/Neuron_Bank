import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import LoanDrawer from './LoanDrawer';
import {
  loadLoanRequests,
  PAGE_SIZE,
  selectLastDecision,
  selectLoanCounts,
  selectLoanFilter,
  selectLoanPagination,
  selectLoanRequests,
  selectLoansError,
  selectLoansStatus,
} from '../../store/loansSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from '../Approvals/Approvals.module.css';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const STATUS_TONES = {
  pending: styles.statusPending,
  approved: styles.statusActive,
  rejected: styles.statusRejected,
  repaid: styles.statusClosed,
};

const DATE = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' });

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function LoanApprovals() {
  const dispatch = useDispatch();
  const requests = useSelector(selectLoanRequests);
  const counts = useSelector(selectLoanCounts);
  const pagination = useSelector(selectLoanPagination);
  const filter = useSelector(selectLoanFilter);
  const status = useSelector(selectLoansStatus);
  const error = useSelector(selectLoansError);
  const lastDecision = useSelector(selectLastDecision);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(loadLoanRequests({ status: 'pending', page: 1 }));
  }, [dispatch]);

  // The decided row leaves the queue, so the drawer must close with it.
  useEffect(() => {
    if (lastDecision?.loanId === selectedId) setSelectedId(null);
  }, [lastDecision, selectedId]);

  const selected = requests.find((item) => item.id === selectedId) ?? null;

  const page = pagination?.page ?? 1;
  const total = pagination?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const isBusy = status === 'pending';

  // What approving the whole pending queue would actually disburse.
  const pendingValue = requests
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.amount, 0);

  const tiles = [
    {
      id: 'pending',
      label: 'Pending',
      value: counts?.pending ?? 0,
      icon: Clock,
      tone: styles.tileAmber,
    },
    {
      id: 'approved',
      label: 'Approved',
      value: counts?.approved ?? 0,
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
      id: 'repaid',
      label: 'Repaid',
      value: counts?.repaid ?? 0,
      icon: BadgeCheck,
      tone: styles.tileViolet,
    },
  ];

  return (
    <div className={cx(styles.page, selected && styles.pageWithDrawer)}>
      <div className={styles.mainCol}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            Loan <span className="u-gradient-text">Requests</span>
          </h1>
          <p className={styles.subtitle}>
            Review applications. Approving a loan credits the principal to the
            applicant&apos;s account immediately.
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

        {filter === 'pending' && pendingValue > 0 && (
          <p className={styles.notice}>
            <TriangleAlert size={18} aria-hidden="true" />
            {formatCurrency(pendingValue)} across this page is awaiting a
            decision. Approved amounts are disbursed straight away.
          </p>
        )}

        <section className={styles.panel}>
          <div className={styles.tabs} role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={filter === tab.value}
                className={cx(styles.tab, filter === tab.value && styles.tabOn)}
                onClick={() => {
                  setSelectedId(null);
                  dispatch(loadLoanRequests({ status: tab.value, page: 1 }));
                }}
              >
                {tab.label}
                {tab.value !== 'all' && counts?.[tab.value] > 0 && (
                  <span className={styles.tabCount}>{counts[tab.value]}</span>
                )}
              </button>
            ))}
          </div>

          {isBusy && requests.length === 0 && (
            <ul className={styles.skeletonList} aria-hidden="true">
              {Array.from({ length: 5 }, (unused, index) => (
                <li key={index} className={styles.skeletonRow} />
              ))}
            </ul>
          )}

          {status === 'failed' && (
            <p className={styles.error} role="alert">
              {error?.message || 'Could not load loan requests.'}
            </p>
          )}

          {status === 'succeeded' && requests.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <p>
                {filter === 'pending'
                  ? 'No loan requests waiting for review.'
                  : `No ${filter === 'all' ? '' : filter} loan requests found.`}
              </p>
            </div>
          )}

          {requests.length > 0 && (
            <div className={cx(styles.tableWrap, isBusy && styles.isStale)}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Applicant</th>
                    <th scope="col" className={styles.alignRight}>
                      Amount
                    </th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Tenure</th>
                    <th scope="col">Applied On</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.alignRight}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((loan, index) => {
                    const applied = new Date(loan.createdAt);

                    return (
                      <tr
                        key={loan.id}
                        className={cx(loan.id === selectedId && styles.rowSelected)}
                      >
                        <td className={styles.cellMuted}>{first + index}</td>

                        <td>
                          <span className={styles.customer}>
                            <span className={styles.avatar} aria-hidden="true">
                              {initials(loan.applicant?.name || '?')}
                            </span>
                            {loan.applicant?.name || 'Unknown'}
                          </span>
                        </td>

                        <td className={cx(styles.alignRight, styles.cellAmount)}>
                          {formatCurrency(loan.amount)}
                        </td>

                        <td className={styles.cellPurpose} title={loan.purpose}>
                          {loan.purpose}
                        </td>

                        <td className={styles.cellMuted}>
                          {loan.tenureMonths} months
                        </td>

                        <td className={styles.cellDate}>
                          <span>{DATE.format(applied)}</span>
                          <span className={styles.cellTime}>
                            {TIME.format(applied)}
                          </span>
                        </td>

                        <td>
                          <span className={cx(styles.status, STATUS_TONES[loan.status])}>
                            {loan.status}
                          </span>
                        </td>

                        <td className={styles.alignRight}>
                          <button
                            type="button"
                            className={styles.viewButton}
                            onClick={() => setSelectedId(loan.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > 0 && (
            <nav className={styles.pager} aria-label="Request pages">
              <p className={styles.pagerCount}>
                Showing {first} to {last} of {total} requests
              </p>

              <div className={styles.pagerControls}>
                <button
                  type="button"
                  className={styles.pagerButton}
                  onClick={() =>
                    dispatch(loadLoanRequests({ status: filter, page: page - 1 }))
                  }
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
                  onClick={() =>
                    dispatch(loadLoanRequests({ status: filter, page: page + 1 }))
                  }
                  disabled={!pagination?.hasMore || isBusy}
                >
                  <ArrowRight size={16} aria-hidden="true" />
                  <span className="u-visually-hidden">Next page</span>
                </button>
              </div>
            </nav>
          )}
        </section>
      </div>

      {selected && <LoanDrawer loan={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export default LoanApprovals;
