import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Hash,
  Mail,
  Percent,
  Phone,
  Receipt,
  TriangleAlert,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  approveLoan,
  decisionReset,
  loadLoanRequests,
  rejectLoan,
  selectDecidingId,
  selectDecisionError,
  selectLoanFilter,
  selectLoanPagination,
} from '../../store/loansSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from '../Approvals/Approvals.module.css';

const MIN_REASON = 5;
const MAX_REASON = 300;

const DATE = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value) {
  return value ? DATE.format(new Date(value)) : '—';
}

function LoanDrawer({ loan, onClose }) {
  const dispatch = useDispatch();
  const decidingId = useSelector(selectDecidingId);
  const decisionError = useSelector(selectDecisionError);
  const filter = useSelector(selectLoanFilter);
  const pagination = useSelector(selectLoanPagination);

  const [tab, setTab] = useState('loan');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(decisionReset());
    setTab('loan');
    setRejecting(false);
    setReason('');
  }, [loan.id, dispatch]);

  const applicant = loan.applicant;
  const account = loan.account;
  const isBusy = decidingId === loan.id;
  const isPending = loan.status === 'pending';

  const reasonError =
    reason.trim().length < MIN_REASON || reason.trim().length > MAX_REASON
      ? `Reason must be between ${MIN_REASON} and ${MAX_REASON} characters`
      : '';

  // The decided row leaves the list, so the page it came from must be re-read.
  const refresh = () =>
    dispatch(loadLoanRequests({ status: filter, page: pagination?.page ?? 1 }));

  const onApprove = async () => {
    const action = await dispatch(approveLoan(loan.id));
    if (approveLoan.fulfilled.match(action)) refresh();
  };

  const onReject = async () => {
    if (reasonError) return;

    const action = await dispatch(rejectLoan({ loanId: loan.id, reason }));
    if (rejectLoan.fulfilled.match(action)) refresh();
  };

  // EMI is only priced once the request exists, so it can be null while pending.
  const loanFacts = [
    { icon: Wallet, label: 'Amount', value: formatCurrency(loan.amount) },
    { icon: Receipt, label: 'Purpose', value: loan.purpose },
    { icon: CalendarDays, label: 'Tenure', value: `${loan.tenureMonths} months` },
    {
      icon: Percent,
      label: 'Interest Rate',
      value: loan.interestRate != null ? `${loan.interestRate}% p.a.` : '—',
    },
    {
      icon: Receipt,
      label: 'Monthly EMI',
      value: loan.emiAmount ? formatCurrency(loan.emiAmount) : '—',
    },
    {
      icon: Wallet,
      label: 'Total Payable',
      value: loan.totalPayable ? formatCurrency(loan.totalPayable) : '—',
    },
    { icon: CalendarDays, label: 'Applied On', value: formatDate(loan.createdAt) },
    ...(loan.status === 'approved' || loan.status === 'repaid'
      ? [
          {
            icon: BadgeCheck,
            label: 'EMIs Paid',
            value: `${loan.emisPaid} of ${loan.tenureMonths}`,
          },
        ]
      : []),
    ...(loan.rejectionReason
      ? [{ icon: X, label: 'Rejection Reason', value: loan.rejectionReason }]
      : []),
  ];

  const applicantFacts = [
    { icon: User, label: 'Full Name', value: applicant?.name },
    { icon: Mail, label: 'Email', value: applicant?.email },
    { icon: Phone, label: 'Phone', value: applicant?.phoneNumber },
    { icon: BadgeCheck, label: 'Customer Status', value: applicant?.status },
    { icon: Hash, label: 'Account Number', value: account?.accountNumber },
    {
      icon: Wallet,
      label: 'Monthly Income',
      value: formatCurrency(loan.monthlyIncome),
    },
    {
      icon: Wallet,
      label: 'Account Balance',
      value: account ? formatCurrency(account.balance) : '—',
    },
  ];

  const rows = tab === 'loan' ? loanFacts : applicantFacts;

  // A loan can only be funded into an account that is actually open.
  const accountBlocked = account && account.status !== 'active';

  return (
    <aside className={styles.drawer} aria-label="Loan request details">
      <header className={styles.drawerHead}>
        <h2 className={styles.drawerTitle}>Loan Request</h2>
        <button type="button" className={styles.drawerClose} onClick={onClose}>
          <X size={18} aria-hidden="true" />
          <span className="u-visually-hidden">Close</span>
        </button>
      </header>

      <div className={styles.drawerBody}>
        <div className={styles.identity}>
          <span className={styles.identityAvatar} aria-hidden="true">
            {(applicant?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p className={styles.identityName}>{applicant?.name || 'Unknown'}</p>
            <p className={styles.identityNumber}>
              {formatCurrency(loan.amount)} · {loan.tenureMonths} months
            </p>
          </div>
          <span className={cx(styles.status, styles[`status${loan.status}`])}>
            {loan.status}
          </span>
        </div>

        {loan.isOverdue && (
          <p className={styles.error}>
            <TriangleAlert size={16} aria-hidden="true" /> This loan has a missed
            EMI.
          </p>
        )}

        {isPending && accountBlocked && (
          <p className={styles.warning} role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            The applicant&apos;s account is {account.status}, so this loan cannot
            be funded until that is resolved.
          </p>
        )}

        <div className={styles.drawerTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'loan'}
            className={cx(styles.drawerTab, tab === 'loan' && styles.drawerTabOn)}
            onClick={() => setTab('loan')}
          >
            Loan Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'applicant'}
            className={cx(styles.drawerTab, tab === 'applicant' && styles.drawerTabOn)}
            onClick={() => setTab('applicant')}
          >
            Applicant
          </button>
        </div>

        <dl className={styles.facts}>
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className={styles.fact}>
              <dt>
                <Icon size={17} aria-hidden="true" />
                {label}
              </dt>
              <dd>{value || '—'}</dd>
            </div>
          ))}
        </dl>

        {decisionError && (
          <p className={styles.error} role="alert">
            {decisionError.message}
          </p>
        )}

        {rejecting && (
          <div className={styles.reasonBlock}>
            <label className={styles.field} htmlFor="reject-loan-reason">
              <span>Why is this being rejected?</span>
              <textarea
                id="reject-loan-reason"
                rows={3}
                maxLength={MAX_REASON}
                placeholder="The applicant sees this, so be specific."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <p className={styles.counter}>
              {reason.length}/{MAX_REASON}
            </p>
          </div>
        )}

        {/* Approving moves money, so say so before the click, not after. */}
        {isPending && !rejecting && !accountBlocked && (
          <p className={styles.hint}>
            Approving credits {formatCurrency(loan.amount)} to{' '}
            {account?.accountNumber || 'the applicant'} and starts the repayment
            schedule.
          </p>
        )}
      </div>

      {isPending && (
        <footer className={styles.drawerFoot}>
          {rejecting ? (
            <>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setRejecting(false)}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={onReject}
                disabled={Boolean(reasonError) || isBusy}
              >
                <X size={18} aria-hidden="true" />
                {isBusy ? 'Rejecting…' : 'Confirm rejection'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={() => setRejecting(true)}
                disabled={isBusy}
              >
                <X size={18} aria-hidden="true" />
                Reject
              </button>
              <button
                type="button"
                className={styles.approveButton}
                onClick={onApprove}
                disabled={isBusy || accountBlocked}
              >
                <Check size={18} aria-hidden="true" />
                {isBusy ? 'Approving…' : 'Approve & disburse'}
              </button>
            </>
          )}
        </footer>
      )}
    </aside>
  );
}

export default LoanDrawer;
