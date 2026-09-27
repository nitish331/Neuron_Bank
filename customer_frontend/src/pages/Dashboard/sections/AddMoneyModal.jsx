import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../../../components/common/Modal/Modal';
import {
  deposit,
  depositReset,
  selectDepositError,
  selectDepositStatus,
} from '../../../store/accountSlice';
import { loadAnalytics, selectAnalyticsMonths } from '../../../store/analyticsSlice';
import { formatCurrency } from '../../../utils/format';
import {
  MAX_DESCRIPTION_LENGTH,
  validateAmount,
  validateDescription,
} from '../../../utils/validation';
import styles from './AddMoneyModal.module.css';

const PRESETS = [500, 1000, 5000, 10000];

function AddMoneyModal({ open, onClose }) {
  const dispatch = useDispatch();
  const status = useSelector(selectDepositStatus);
  const error = useSelector(selectDepositError);
  const months = useSelector(selectAnalyticsMonths);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState(null);

  const amountError = validateAmount(amount);
  const descriptionError = validateDescription(description);
  const isSubmitting = status === 'pending';
  const canSubmit = !amountError && !descriptionError && !isSubmitting;

  // Start clean each time the dialog opens.
  useEffect(() => {
    if (!open) return;

    setAmount('');
    setDescription('');
    setTouched(false);
    setResult(null);
    dispatch(depositReset());
  }, [open, dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const action = await dispatch(deposit({ amount, description }));

    if (deposit.fulfilled.match(action)) {
      setResult(action.payload);
      // Totals are server-computed, so they have to be re-read, not patched.
      dispatch(loadAnalytics({ months }));
    }
  };

  const fieldError = error?.fieldErrors?.amount || (touched ? amountError : '');

  return (
    <Modal open={open} title={result ? 'Money added' : 'Add Money'} onClose={onClose}>
      {result ? (
        <div className={styles.success}>
          <span className={styles.successBadge} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.successAmount}>
            {formatCurrency(result.transaction.amount)} added
          </p>
          <dl className={styles.receipt}>
            <div>
              <dt>New balance</dt>
              <dd>{formatCurrency(result.balance)}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd className={styles.reference}>{result.transaction.reference}</dd>
            </div>
          </dl>
          <button type="button" className={styles.submit} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error?.message && !error?.fieldErrors?.amount && (
            <p className={styles.formError} role="alert">
              {error.message}
            </p>
          )}

          <div className={styles.field}>
            <label htmlFor="deposit-amount">Amount</label>
            <div className={styles.amountControl}>
              <span className={styles.currency} aria-hidden="true">
                ₹
              </span>
              <input
                id="deposit-amount"
                className={styles.amountInput}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onBlur={() => setTouched(true)}
                // Digits and one dot only, so the field cannot hold junk.
                onChange={(event) =>
                  setAmount(event.target.value.replace(/[^\d.]/g, '').slice(0, 10))
                }
                aria-invalid={fieldError ? true : undefined}
              />
            </div>
            {fieldError && <p className={styles.fieldError}>{fieldError}</p>}
          </div>

          <ul className={styles.presets}>
            {PRESETS.map((preset) => (
              <li key={preset}>
                <button
                  type="button"
                  className={styles.preset}
                  onClick={() => setAmount(String(preset))}
                >
                  +{formatCurrency(preset).replace('.00', '')}
                </button>
              </li>
            ))}
          </ul>

          <div className={styles.field}>
            <label htmlFor="deposit-note">
              Description <span className={styles.optional}>optional</span>
            </label>
            <input
              id="deposit-note"
              className={styles.noteInput}
              type="text"
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="What is this for?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className={styles.counter}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          {/* Stays disabled until the amount actually passes the server's rules. */}
          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {isSubmitting ? 'Adding…' : 'Add Money'}
          </button>
        </form>
      )}
    </Modal>
  );
}

export default AddMoneyModal;
