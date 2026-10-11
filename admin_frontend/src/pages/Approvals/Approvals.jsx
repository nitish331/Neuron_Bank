import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
  XCircle,
} from 'lucide-react';
import AccountDrawer from './AccountDrawer';
import {
  loadAccounts,
  PAGE_SIZE,
  selectAccounts,
  selectAccountsError,
  selectAccountsStatus,
  selectFilter,
  selectLastDecision,
  selectPagination,
  selectStatusCounts,
} from '../../store/accountsSlice';
import cx from '../../utils/classNames';
import styles from './Approvals.module.css';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const STATUS_TONES = {
  pending: styles.statusPending,
  active: styles.statusActive,
  rejected: styles.statusRejected,
  closed: styles.statusClosed,
  blocked: styles.statusClosed,
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

function Approvals() {
  const dispatch = useDispatch();
  const accounts = useSelector(selectAccounts);
  const counts = useSelector(selectStatusCounts);
  const pagination = useSelector(selectPagination);
  const filter = useSelector(selectFilter);
  const status = useSelector(selectAccountsStatus);
  const error = useSelector(selectAccountsError);
  const lastDecision = useSelector(selectLastDecision);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(loadAccounts({ status: 'pending', page: 1 }));
  }, [dispatch]);

  // The decided row leaves the queue, so the drawer must close with it.
  useEffect(() => {
    if (lastDecision?.accountId === selectedId) setSelectedId(null);
  }, [lastDecision, selectedId]);

  const selected = accounts.find((item) => item.id === selectedId) ?? null;

  const page = pagination?.page ?? 1;
  const total = pagination?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const isBusy = status === 'pending';

  const tiles = [
    {
      id: 'pending',
      label: 'Pending',
      value: counts?.pending ?? 0,
      icon: Clock,
      tone: styles.tileAmber,
    },
    {
      id: 'active',
      label: 'Approved',
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
      label: 'Total Requests',
      value: counts
        ? Object.values(counts).reduce((sum, count) => sum + count, 0)
        : 0,
      icon: Users,
      tone: styles.tileViolet,
    },
  ];

  return (
    <div className={cx(styles.page, selected && styles.pageWithDrawer)}>
      <div className={styles.mainCol}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            Pending Account <span className="u-gradient-text">Approvals</span>
          </h1>
          <p className={styles.subtitle}>
            Review and approve new account requests from customers.
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
                  dispatch(loadAccounts({ status: tab.value, page: 1 }));
                }}
              >
                {tab.label}
                {tab.value !== 'all' && counts?.[tab.value] > 0 && (
                  <span className={styles.tabCount}>{counts[tab.value]}</span>
                )}
              </button>
            ))}
          </div>

          {isBusy && accounts.length === 0 && (
            <ul className={styles.skeletonList} aria-hidden="true">
              {Array.from({ length: 5 }, (unused, index) => (
                <li key={index} className={styles.skeletonRow} />
              ))}
            </ul>
          )}

          {status === 'failed' && (
            <p className={styles.error} role="alert">
              {error?.message || 'Could not load account requests.'}
            </p>
          )}

          {status === 'succeeded' && accounts.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <p>
                {filter === 'pending'
                  ? 'Nothing waiting for review.'
                  : `No ${filter === 'all' ? '' : filter} accounts found.`}
              </p>
              {filter === 'pending' && (
                <p className={styles.hint}>New requests will appear here.</p>
              )}
            </div>
          )}

          {accounts.length > 0 && (
            <div className={cx(styles.tableWrap, isBusy && styles.isStale)}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Account Number</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Applied On</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.alignRight}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account, index) => {
                    const owner = account.owner;
                    const applied = new Date(account.openedAt);

                    return (
                      <tr
                        key={account.id}
                        className={cx(
                          account.id === selectedId && styles.rowSelected,
                        )}
                      >
                        <td className={styles.cellMuted}>{first + index}</td>

                        <td>
                          <span className={styles.customer}>
                            <span className={styles.avatar} aria-hidden="true">
                              {initials(owner?.name || '?')}
                            </span>
                            {owner?.name || 'Unknown'}
                          </span>
                        </td>

                        <td className={styles.cellMono}>{account.accountNumber}</td>
                        <td className={styles.cellMuted}>{owner?.email || '—'}</td>
                        <td className={styles.cellMuted}>
                          {owner?.phoneNumber || '—'}
                        </td>

                        <td className={styles.cellDate}>
                          <span>{DATE.format(applied)}</span>
                          <span className={styles.cellTime}>
                            {TIME.format(applied)}
                          </span>
                        </td>

                        <td>
                          <span
                            className={cx(
                              styles.status,
                              STATUS_TONES[account.status],
                            )}
                          >
                            {account.status}
                          </span>
                        </td>

                        <td className={styles.alignRight}>
                          <button
                            type="button"
                            className={styles.viewButton}
                            onClick={() => setSelectedId(account.id)}
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
                  onClick={() => dispatch(loadAccounts({ status: filter, page: page - 1 }))}
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
                  onClick={() => dispatch(loadAccounts({ status: filter, page: page + 1 }))}
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

      {selected && (
        <AccountDrawer account={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

export default Approvals;
