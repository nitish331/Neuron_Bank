import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Hash,
  Mail,
  Phone,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  approve,
  close,
  decisionReset,
  loadAccounts,
  reject,
  selectDecidingId,
  selectDecisionError,
  selectFilter,
  selectPagination,
} from '../../store/accountsSlice';
import cx from '../../utils/classNames';
import styles from './Approvals.module.css';

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

function AccountDrawer({ account, onClose }) {
  const dispatch = useDispatch();
  const decidingId = useSelector(selectDecidingId);
  const decisionError = useSelector(selectDecisionError);
  const filter = useSelector(selectFilter);
  const pagination = useSelector(selectPagination);

  const [tab, setTab] = useState('personal');
  // 'reject' and 'close' both need a reason, so they share the field.
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(decisionReset());
    setTab('personal');
    setMode(null);
    setReason('');
  }, [account.id, dispatch]);

  const owner = account.owner;
  const isBusy = decidingId === account.id;
  const isPending = account.status === 'pending';

  const reasonError =
    reason.trim().length < MIN_REASON || reason.trim().length > MAX_REASON
      ? `Reason must be between ${MIN_REASON} and ${MAX_REASON} characters`
      : '';

  // The decided row leaves the list, so the page it came from must be re-read.
  const refresh = () =>
    dispatch(loadAccounts({ status: filter, page: pagination?.page ?? 1 }));

  const onApprove = async () => {
    const action = await dispatch(approve(account.id));
    if (approve.fulfilled.match(action)) refresh();
  };

  const onReject = async () => {
    if (reasonError) return;

    const action = await dispatch(reject({ accountId: account.id, reason }));
    if (reject.fulfilled.match(action)) refresh();
  };

  const onCloseAccount = async () => {
    if (reasonError) return;

    const action = await dispatch(close({ accountId: account.id, reason }));
    if (close.fulfilled.match(action)) refresh();
  };

  // Only a live account can be closed; a pending one is decided instead.
  const canClose = ['active', 'blocked'].includes(account.status);

  const personal = [
    { icon: User, label: 'Full Name', value: owner?.name },
    { icon: Mail, label: 'Email', value: owner?.email },
    { icon: Phone, label: 'Phone', value: owner?.phoneNumber },
    { icon: CalendarDays, label: 'Date of Birth', value: formatDate(owner?.dateOfBirth) },
    {
      icon: BadgeCheck,
      label: 'Email Verified',
      value: owner?.emailVerifiedAt ? formatDate(owner.emailVerifiedAt) : 'Not verified',
    },
    { icon: CalendarDays, label: 'Registered', value: formatDate(owner?.joinedAt) },
  ];

  const accountFacts = [
    { icon: Hash, label: 'Account Number', value: account.accountNumber },
    { icon: Wallet, label: 'Balance', value: `${account.currency} ${account.balance}` },
    { icon: CalendarDays, label: 'Applied On', value: formatDate(account.openedAt) },
    { icon: BadgeCheck, label: 'Customer Status', value: owner?.status ?? '—' },
    ...(account.rejectionReason
      ? [{ icon: X, label: 'Rejection Reason', value: account.rejectionReason }]
      : []),
  ];

  const rows = tab === 'personal' ? personal : accountFacts;

  return (
    <aside className={styles.drawer} aria-label="Account details">
      <header className={styles.drawerHead}>
        <h2 className={styles.drawerTitle}>Account Details</h2>
        <button type="button" className={styles.drawerClose} onClick={onClose}>
          <X size={18} aria-hidden="true" />
          <span className="u-visually-hidden">Close</span>
        </button>
      </header>

      <div className={styles.drawerBody}>
        <div className={styles.identity}>
          <span className={styles.identityAvatar} aria-hidden="true">
            {(owner?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p className={styles.identityName}>{owner?.name || 'Unknown'}</p>
            <p className={styles.identityNumber}>{account.accountNumber}</p>
          </div>
          <span className={cx(styles.status, styles[`status${account.status}`])}>
            {account.status}
          </span>
        </div>

        <div className={styles.drawerTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'personal'}
            className={cx(styles.drawerTab, tab === 'personal' && styles.drawerTabOn)}
            onClick={() => setTab('personal')}
          >
            Personal Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'account'}
            className={cx(styles.drawerTab, tab === 'account' && styles.drawerTabOn)}
            onClick={() => setTab('account')}
          >
            Account Details
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

        {mode && (
          <div className={styles.reasonBlock}>
            <label className={styles.field} htmlFor="reject-reason">
              <span>
                {mode === 'close'
                  ? 'Why is this account being closed?'
                  : 'Why is this being rejected?'}
              </span>
              <textarea
                id="reject-reason"
                rows={3}
                maxLength={MAX_REASON}
                placeholder="The customer sees this, so be specific."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <p className={styles.counter}>
              {reason.length}/{MAX_REASON}
            </p>
          </div>
        )}
      </div>

      {(isPending || canClose) && (
        <footer className={styles.drawerFoot}>
          {mode ? (
            <>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setMode(null)}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={mode === 'close' ? onCloseAccount : onReject}
                disabled={Boolean(reasonError) || isBusy}
              >
                <X size={18} aria-hidden="true" />
                {isBusy
                  ? 'Working…'
                  : mode === 'close'
                    ? 'Confirm closure'
                    : 'Confirm rejection'}
              </button>
            </>
          ) : isPending ? (
            <>
              <button
                type="button"
                className={styles.rejectButton}
                onClick={() => setMode('reject')}
                disabled={isBusy}
              >
                <X size={18} aria-hidden="true" />
                Reject
              </button>
              <button
                type="button"
                className={styles.approveButton}
                onClick={onApprove}
                disabled={isBusy}
              >
                <Check size={18} aria-hidden="true" />
                {isBusy ? 'Approving…' : 'Approve'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.rejectButton}
              onClick={() => setMode('close')}
              disabled={isBusy}
            >
              <X size={18} aria-hidden="true" />
              Close account
            </button>
          )}
        </footer>
      )}

    </aside>
  );
}

export default AccountDrawer;
