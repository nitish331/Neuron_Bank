import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, Ban, CircleCheck, Search, Users } from 'lucide-react';
import StatusModal from './StatusModal';
import {
  loadCustomers,
  PAGE_SIZE,
  selectChangingId,
  selectCustomers,
  selectCustomersApplied,
  selectCustomersError,
  selectCustomersPagination,
  selectCustomersStatus,
} from '../../store/customersSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from '../Approvals/Approvals.module.css';
import own from './Customers.module.css';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_TONES = {
  active: styles.statusActive,
  suspended: styles.statusRejected,
  pending: styles.statusPending,
  rejected: styles.statusRejected,
};

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function Customers() {
  const dispatch = useDispatch();
  const customers = useSelector(selectCustomers);
  const pagination = useSelector(selectCustomersPagination);
  const applied = useSelector(selectCustomersApplied);
  const status = useSelector(selectCustomersStatus);
  const error = useSelector(selectCustomersError);
  const changingId = useSelector(selectChangingId);

  const [search, setSearch] = useState('');
  const [target, setTarget] = useState(null);

  useEffect(() => {
    dispatch(loadCustomers({ page: 1 }));
  }, [dispatch]);

  const page = pagination?.page ?? 1;
  const total = pagination?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const isBusy = status === 'pending';

  const query = (overrides) =>
    dispatch(
      loadCustomers({
        status: applied.status,
        search: applied.search,
        page: 1,
        ...overrides,
      }),
    );

  return (
    <div className={styles.page}>
      <div className={styles.mainCol}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            <span className="u-gradient-text">Customers</span>
          </h1>
          <p className={styles.subtitle}>
            Suspending a customer signs them out everywhere and blocks them from
            signing back in.
          </p>
        </header>

        <section className={styles.panel}>
          <form
            className={own.toolbar}
            onSubmit={(event) => {
              event.preventDefault();
              query({ search: search.trim() });
            }}
          >
            <label className={own.search}>
              <Search size={18} aria-hidden="true" />
              <span className="u-visually-hidden">Search customers</span>
              <input
                type="search"
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <button type="submit" className={own.searchButton} disabled={isBusy}>
              Search
            </button>
          </form>

          <div className={styles.tabs} role="tablist">
            {FILTERS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                role="tab"
                aria-selected={applied.status === option.value}
                className={cx(
                  styles.tab,
                  applied.status === option.value && styles.tabOn,
                )}
                onClick={() => query({ status: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>

          {isBusy && customers.length === 0 && (
            <ul className={styles.skeletonList} aria-hidden="true">
              {Array.from({ length: 5 }, (unused, index) => (
                <li key={index} className={styles.skeletonRow} />
              ))}
            </ul>
          )}

          {status === 'failed' && (
            <p className={styles.error} role="alert">
              {error?.message || 'Could not load customers.'}
            </p>
          )}

          {status === 'succeeded' && customers.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <Users size={24} />
              </span>
              <p>
                {applied.search
                  ? `Nothing matches "${applied.search}".`
                  : 'No customers found.'}
              </p>
            </div>
          )}

          {customers.length > 0 && (
            <div className={cx(styles.tableWrap, isBusy && styles.isStale)}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Account</th>
                    <th scope="col" className={styles.alignRight}>
                      Balance
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.alignRight}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => {
                    const isSuspended = customer.status === 'suspended';
                    // Only an active or suspended customer can be toggled.
                    const canToggle = isSuspended || customer.status === 'active';

                    return (
                      <tr key={customer.id}>
                        <td className={styles.cellMuted}>{first + index}</td>

                        <td>
                          <span className={styles.customer}>
                            <span className={styles.avatar} aria-hidden="true">
                              {initials(customer.name || '?')}
                            </span>
                            {customer.name}
                          </span>
                        </td>

                        <td className={styles.cellMuted}>{customer.email}</td>
                        <td className={styles.cellMuted}>{customer.phoneNumber}</td>

                        <td className={styles.cellMono}>
                          {customer.account?.accountNumber || '—'}
                        </td>

                        <td className={cx(styles.alignRight, styles.cellAmount)}>
                          {customer.account
                            ? formatCurrency(customer.account.balance)
                            : '—'}
                        </td>

                        <td>
                          <span
                            className={cx(
                              styles.status,
                              STATUS_TONES[customer.status],
                            )}
                          >
                            {customer.status}
                          </span>
                        </td>

                        <td className={styles.alignRight}>
                          {canToggle && (
                            <button
                              type="button"
                              className={cx(
                                styles.viewButton,
                                isSuspended ? own.restore : own.suspend,
                              )}
                              onClick={() =>
                                setTarget({
                                  customer,
                                  next: isSuspended ? 'active' : 'suspended',
                                })
                              }
                              disabled={changingId === customer.id}
                            >
                              {isSuspended ? (
                                <CircleCheck size={15} aria-hidden="true" />
                              ) : (
                                <Ban size={15} aria-hidden="true" />
                              )}
                              {isSuspended ? 'Restore' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > 0 && (
            <nav className={styles.pager} aria-label="Customer pages">
              <p className={styles.pagerCount}>
                Showing {first} to {last} of {total} customers
              </p>

              <div className={styles.pagerControls}>
                <button
                  type="button"
                  className={styles.pagerButton}
                  onClick={() => query({ page: page - 1 })}
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
                  onClick={() => query({ page: page + 1 })}
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

      <StatusModal
        open={Boolean(target)}
        customer={target?.customer}
        next={target?.next}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}

export default Customers;
