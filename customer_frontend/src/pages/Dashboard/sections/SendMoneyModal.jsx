import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { CheckCircle2, Users } from 'lucide-react';
import Modal from '../../../components/common/Modal/Modal';
import {
  selectTransferError,
  selectTransferStatus,
  transfer,
  transferReset,
} from '../../../store/accountSlice';
import {
  loadBeneficiaries,
  selectBeneficiaries,
  selectBeneficiariesStatus,
} from '../../../store/beneficiariesSlice';
import { loadAnalytics, selectAnalyticsMonths } from '../../../store/analyticsSlice';
import { formatCurrency } from '../../../utils/format';
import {
  MAX_DESCRIPTION_LENGTH,
  validateAmount,
  validateDescription,
} from '../../../utils/validation';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from './SendMoneyModal.module.css';

function SendMoneyModal({ open, balance, onClose }) {
  const dispatch = useDispatch();
  const beneficiaries = useSelector(selectBeneficiaries);
  const listStatus = useSelector(selectBeneficiariesStatus);
  const status = useSelector(selectTransferStatus);
  const error = useSelector(selectTransferError);
  const months = useSelector(selectAnalyticsMonths);

  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState(null);

  // A disabled beneficiary is refused by the server, so never offer one.
  const payees = useMemo(
    () => beneficiaries.filter((item) => item.status === 'active'),
    [beneficiaries],
  );

  useEffect(() => {
    if (!open) return;

    dispatch(transferReset());
    dispatch(loadBeneficiaries());
    setBeneficiaryId('');
    setAmount('');
    setDescription('');
    setTouched(false);
    setResult(null);
  }, [open, dispatch]);

  const amountError = validateAmount(amount);
  const descriptionError = validateDescription(description);
  // Caught here as well as server-side, so the request is not wasted.
  const overBalance =
    !amountError && balance !== null && Number(amount) > balance
      ? 'That is more than your available balance'
      : '';

  const isSubmitting = status === 'pending';
  const canSubmit =
    Boolean(beneficiaryId) &&
    !amountError &&
    !overBalance &&
    !descriptionError &&
    !isSubmitting;

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const action = await dispatch(transfer({ beneficiaryId, amount, description }));

    if (transfer.fulfilled.match(action)) {
      setResult(action.payload);
      // Totals are server-computed, so they have to be re-read, not patched.
      dispatch(loadAnalytics({ months }));
    }
  };

  const fieldError = touched ? amountError || overBalance : overBalance;

  return (
    <Modal
      open={open}
      title={result ? 'Money sent' : 'Send Money'}
      onClose={onClose}
    >
      {result ? (
        <div className={styles.body}>
          <span className={styles.badgeGood} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.sentAmount}>
            {formatCurrency(result.data.transaction.amount)} sent
          </p>
          <dl className={styles.receipt}>
            <div>
              <dt>To</dt>
              <dd>{result.data.beneficiary.name}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{result.data.beneficiary.accountNumber}</dd>
            </div>
            <div>
              <dt>New balance</dt>
              <dd>{formatCurrency(result.data.balance)}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd className={styles.reference}>
                {result.data.transaction.reference}
              </dd>
            </div>
          </dl>
          <button type="button" className={styles.primary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : payees.length === 0 && listStatus === 'succeeded' ? (
        <div className={styles.body}>
          <span className={styles.badge} aria-hidden="true">
            <Users size={28} />
          </span>
          <p className={styles.text}>
            {beneficiaries.length === 0
              ? 'You have no saved beneficiaries yet.'
              : 'All of your beneficiaries are disabled.'}
          </p>
          <p className={styles.hint}>
            Money can only be sent to an active saved beneficiary.
          </p>
          <Link
            to={ROUTES.dashboardBeneficiaries}
            className={styles.primary}
            onClick={onClose}
          >
            Manage beneficiaries
          </Link>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate>
          {error?.message && (
            <p className={styles.formError} role="alert">
              {error.message}
            </p>
          )}

          <fieldset className={styles.payees}>
            <legend>Send to</legend>

            {listStatus === 'pending' && payees.length === 0 && (
              <p className={styles.hint}>Loading your beneficiaries…</p>
            )}

            {payees.map((payee) => (
              <label
                key={payee.id}
                className={cx(
                  styles.payee,
                  beneficiaryId === payee.id && styles.payeeOn,
                )}
              >
                <input
                  type="radio"
                  name="beneficiary"
                  value={payee.id}
                  checked={beneficiaryId === payee.id}
                  onChange={() => setBeneficiaryId(payee.id)}
                />
                <span className={styles.payeeAvatar} aria-hidden="true">
                  {payee.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className={styles.payeeMeta}>
                  <span className={styles.payeeName}>{payee.name}</span>
                  <span className={styles.payeeAccount}>{payee.accountNumber}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="transfer-amount">Amount</label>
            <div className={styles.amountControl}>
              <span className={styles.currency} aria-hidden="true">
                ₹
              </span>
              <input
                id="transfer-amount"
                className={styles.amountInput}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onBlur={() => setTouched(true)}
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^\d.]/g, '').slice(0, 10))
                }
                aria-invalid={fieldError ? true : undefined}
              />
            </div>
            {fieldError ? (
              <p className={styles.fieldError}>{fieldError}</p>
            ) : (
              balance !== null && (
                <p className={styles.hint}>
                  Available {formatCurrency(balance)}
                </p>
              )
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="transfer-note">
              Description <span className={styles.optional}>optional</span>
            </label>
            <input
              id="transfer-note"
              className={styles.noteInput}
              type="text"
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="What is this for?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {/* Stays disabled until a payee is picked and the amount is payable. */}
          <button type="submit" className={styles.primary} disabled={!canSubmit}>
            {isSubmitting ? 'Sending…' : 'Send Money'}
          </button>
        </form>
      )}
    </Modal>
  );
}

export default SendMoneyModal;
