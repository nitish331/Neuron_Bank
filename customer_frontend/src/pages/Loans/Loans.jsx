import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  Plus,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import ApplyLoanModal from './ApplyLoanModal';
import {
  loadLoanRates,
  loadLoans,
  selectCanApply,
  selectLoanFilter,
  selectLoanRates,
  selectLoanRequests,
  selectLoanSummary,
  selectLoansError,
  selectLoansStatus,
  selectOutstanding,
} from '../../store/loansSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from './Loans.module.css';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_TONES = {
  pending: styles.statusPending,
  approved: styles.statusApproved,
  rejected: styles.statusRejected,
  repaid: styles.statusRepaid,
};

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
}

function Loans() {
  const dispatch = useDispatch();
  const requests = useSelector(selectLoanRequests);
  const summary = useSelector(selectLoanSummary);
  const canApply = useSelector(selectCanApply);
  const status = useSelector(selectLoansStatus);
  const error = useSelector(selectLoansError);
  const filter = useSelector(selectLoanFilter);
  const rates = useSelector(selectLoanRates);
  const outstanding = useSelector(selectOutstanding);

  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    dispatch(loadLoans());
    dispatch(loadLoanRates());
  }, [dispatch]);

  const tiles = [
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: formatCurrency(outstanding.total),
      meta: outstanding.monthlyEmi
        ? `${formatCurrency(outstanding.monthlyEmi)} per month`
        : 'Nothing to repay',
      icon: Wallet,
      tone: styles.tileViolet,
    },
    {
      id: 'approved',
      label: 'Approved',
      value: formatCurrency(summary?.approved?.total ?? 0),
      meta: `${summary?.approved?.count ?? 0} loan${summary?.approved?.count === 1 ? '' : 's'}`,
      icon: CircleCheck,
      tone: styles.tileGreen,
    },
    {
      id: 'pending',
      label: 'Pending',
      value: formatCurrency(summary?.pending?.total ?? 0),
      meta: `${summary?.pending?.count ?? 0} awaiting review`,
      icon: Clock,
      tone: styles.tileAmber,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      value: formatCurrency(summary?.rejected?.total ?? 0),
      meta: `${summary?.rejected?.count ?? 0} declined`,
      icon: CircleX,
      tone: styles.tileRed,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Loans</h1>
          <p className={styles.subtitle}>
            Apply for a loan and track your repayments in one place.
          </p>
        </div>

        {/* The server allows one pending request at a time. */}
        <button
          type="button"
          className={styles.applyButton}
          onClick={() => setApplyOpen(true)}
          disabled={!canApply}
          title={canApply ? undefined : 'You already have a request awaiting review'}
        >
          <Plus size={18} aria-hidden="true" />
          Apply for a Loan
        </button>
      </header>

      {outstanding.overdueCount > 0 && (
        <p className={styles.overdueBanner} role="alert">
          <TriangleAlert size={18} aria-hidden="true" />
          {outstanding.overdueCount === 1
            ? 'One of your EMIs could not be collected.'
            : `${outstanding.overdueCount} of your EMIs could not be collected.`}{' '}
          Top up your balance to clear the arrears.
        </p>
      )}

      <section className={styles.tiles}>
        {tiles.map(({ id, label, value, meta, icon: Icon, tone }) => (
          <article key={id} className={styles.tile}>
            <span className={cx(styles.tileIcon, tone)} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div className={styles.tileBody}>
              <p className={styles.tileLabel}>{label}</p>
              <p className={styles.tileValue}>{value}</p>
              <p className={styles.tileMeta}>{meta}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Interest Rates (p.a.)</h2>
        </header>

        {rates?.tenures ? (
          <ul className={styles.slabs}>
            {rates.tenures.map((item) => (
              <li key={item.months} className={styles.slab}>
                <span className={styles.slabLabel}>{item.label}</span>
                <strong className={styles.slabRate}>{item.rate}%</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Loading rates…</p>
        )}
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Your Loans</h2>
            <p className={styles.panelSubtitle}>
              EMIs are debited automatically on each due date.
            </p>
          </div>
        </header>

        <div className={styles.filters} role="tablist">
          {FILTERS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              className={cx(styles.filter, filter === option.value && styles.filterOn)}
              onClick={() => dispatch(loadLoans({ status: option.value || undefined }))}
            >
              {option.label}
            </button>
          ))}
        </div>

        {status === 'pending' && (
          <ul className={styles.skeletonList} aria-hidden="true">
            {Array.from({ length: 2 }, (unused, index) => (
              <li key={index} className={styles.skeletonRow} />
            ))}
          </ul>
        )}

        {status === 'failed' && (
          <p className={styles.error} role="alert">
            {error?.message || 'Could not load your loans.'}
          </p>
        )}

        {status === 'succeeded' && requests.length === 0 && (
          <div className={styles.emptyState}>
            <p>No loan requests{filter ? ` marked ${filter}` : ' yet'}.</p>
            {!filter && (
              <p className={styles.hint}>
                Apply above to see rates and an EMI quote before you commit.
              </p>
            )}
          </div>
        )}

        <ul className={styles.list}>
          {requests.map((loan) => {
            const repayment = loan.repayment;
            const progress = repayment
              ? Math.round((repayment.emisPaid / repayment.emisTotal) * 100)
              : 0;

            return (
              <li key={loan.id} className={styles.loan}>
                <header className={styles.loanHead}>
                  <div>
                    <p className={styles.loanAmount}>{formatCurrency(loan.amount)}</p>
                    <p className={styles.loanPurpose}>{loan.purpose}</p>
                  </div>

                  <div className={styles.loanTags}>
                    {repayment?.isOverdue && (
                      <span className={cx(styles.status, styles.statusOverdue)}>
                        Overdue
                      </span>
                    )}
                    <span className={cx(styles.status, STATUS_TONES[loan.status])}>
                      {loan.status}
                    </span>
                  </div>
                </header>

                <dl className={styles.loanFacts}>
                  <div>
                    <dt>Tenure</dt>
                    <dd>{loan.tenureMonths} months</dd>
                  </div>
                  <div>
                    <dt>Interest rate</dt>
                    <dd>{loan.interestRate != null ? `${loan.interestRate}%` : '—'}</dd>
                  </div>
                  <div>
                    <dt>Monthly EMI</dt>
                    <dd>{loan.emiAmount ? formatCurrency(loan.emiAmount) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Total payable</dt>
                    <dd>
                      {loan.totalPayable ? formatCurrency(loan.totalPayable) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Applied</dt>
                    <dd>{formatDate(loan.createdAt)}</dd>
                  </div>
                </dl>

                {/* Only an approved or repaid loan carries a repayment record. */}
                {repayment && (
                  <div className={styles.repayment}>
                    <div className={styles.progressHead}>
                      <span>
                        {repayment.emisPaid} of {repayment.emisTotal} EMIs paid
                      </span>
                      <span>{formatCurrency(repayment.outstanding)} left</span>
                    </div>

                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span
                        className={styles.progressFill}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className={styles.repaymentMeta}>
                      {loan.status === 'repaid' ? (
                        <span className={styles.clearedNote}>
                          <CircleCheck size={15} aria-hidden="true" />
                          Cleared on {formatDate(repayment.repaidAt)}
                        </span>
                      ) : (
                        <>
                          <span>
                            <CalendarClock size={15} aria-hidden="true" />
                            Next EMI {formatDate(repayment.nextEmiDate)}
                            {repayment.nextEmiAmount
                              ? ` · ${formatCurrency(repayment.nextEmiAmount)}`
                              : ''}
                          </span>
                          {repayment.emisMissed > 0 && (
                            <span className={styles.missedNote}>
                              {repayment.emisMissed} missed
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {loan.status === 'rejected' && loan.rejectionReason && (
                  <p className={styles.rejection}>
                    <strong>Reason:</strong> {loan.rejectionReason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <ApplyLoanModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}

export default Loans;
