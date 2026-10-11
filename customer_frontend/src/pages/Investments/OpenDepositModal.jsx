import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import Stepper from '../../components/common/Stepper/Stepper';
import {
  createDeposit,
  createReset,
  loadDeposits,
  selectCreateError,
  selectCreateStatus,
  selectRates,
} from '../../store/investmentsSlice';
import { loadAnalytics, selectAnalyticsMonths } from '../../store/analyticsSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from './Investments.module.css';

const STEPS = [
  { id: 'amount', label: 'Amount' },
  { id: 'tenure', label: 'Tenure' },
  { id: 'review', label: 'Review' },
];

/** Mirrors the two create validators in the backend. */
const LIMITS = {
  fd: { min: 1000, max: 10000000, field: 'amount', label: 'Deposit amount' },
  rd: { min: 500, max: 1000000, field: 'installmentAmount', label: 'Monthly instalment' },
};

function validateAmount(product, value) {
  const { min, max, label } = LIMITS[product];
  const trimmed = String(value).trim();

  if (!trimmed) return `${label} is required`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return 'Enter a valid amount with at most 2 decimal places';
  }

  const amount = Number(trimmed);
  if (amount < min || amount > max) {
    return `${label} must be between ${formatCurrency(min)} and ${formatCurrency(max)}`;
  }
  return '';
}

function totalMonths({ years, months }) {
  return Number(years || 0) * 12 + Number(months || 0);
}

function OpenDepositModal({ open, product, balance, onClose }) {
  const dispatch = useDispatch();
  const rates = useSelector(selectRates(product));
  const status = useSelector(selectCreateStatus);
  const error = useSelector(selectCreateError);
  const analyticsMonths = useSelector(selectAnalyticsMonths);

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState({ years: 0, months: 0 });
  const [result, setResult] = useState(null);

  const isFd = product === 'fd';

  useEffect(() => {
    if (!open) return;

    dispatch(createReset());
    setStep(0);
    setAmount('');
    setTerm({ years: 0, months: 0 });
    setResult(null);
  }, [open, product, dispatch]);

  const amountError = validateAmount(product, amount);
  const months = totalMonths(term);

  // The slab lookup is what actually accepts a term, so match it here.
  const slab = useMemo(
    () => rates?.slabs?.find((s) => months >= s.minMonths && months <= s.maxMonths),
    [rates, months],
  );

  const termError = !months
    ? 'Choose a tenure'
    : !slab
      ? `Tenure must be between ${rates?.minMonths ?? 3} and ${rates?.maxMonths ?? 60} months`
      : '';

  const overBalance =
    isFd && !amountError && balance !== null && Number(amount) > balance
      ? 'That is more than your available balance'
      : '';

  const isSubmitting = status === 'pending';

  const submit = async () => {
    const body = { [LIMITS[product].field]: Number(amount), ...term };
    const action = await dispatch(createDeposit({ product, body }));

    if (createDeposit.fulfilled.match(action)) {
      setResult(action.payload);
      // Balance and totals are server-computed, so re-read rather than patch.
      dispatch(loadDeposits(product));
      dispatch(loadAnalytics({ months: analyticsMonths }));
    }
  };

  const title = isFd ? 'Open a Fixed Deposit' : 'Open a Recurring Deposit';

  return (
    <Modal open={open} title={result ? 'Deposit opened' : title} onClose={onClose}>
      {result ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.sentAmount}>{result.deposit.depositNumber}</p>
          <dl className={styles.receipt}>
            <div>
              <dt>{isFd ? 'Principal' : 'Monthly instalment'}</dt>
              <dd>
                {formatCurrency(
                  isFd ? result.deposit.principal : result.deposit.installmentAmount,
                )}
              </dd>
            </div>
            <div>
              <dt>Tenure</dt>
              <dd>{result.deposit.tenureLabel}</dd>
            </div>
            <div>
              <dt>Interest rate</dt>
              <dd>{result.deposit.interestRate}% p.a.</dd>
            </div>
            <div>
              <dt>{isFd ? 'Maturity amount' : 'Projected maturity'}</dt>
              <dd>
                {formatCurrency(
                  isFd
                    ? result.deposit.maturityAmount
                    : result.deposit.projectedMaturityAmount,
                )}
              </dd>
            </div>
          </dl>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <div className={styles.wizard}>
          <Stepper
            steps={STEPS}
            currentStep={step}
            onStepClick={isSubmitting ? undefined : setStep}
          />

          {error?.message && (
            <p className={styles.modalError} role="alert">
              {error.message}
            </p>
          )}

          {step === 0 && (
            <div className={styles.modalForm}>
              <label className={styles.field}>
                <span>{LIMITS[product].label}</span>
                <div className={styles.amountControl}>
                  <span className={styles.currency} aria-hidden="true">
                    ₹
                  </span>
                  <input
                    className={styles.amountInput}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/[^\d.]/g, '').slice(0, 10))
                    }
                  />
                </div>
              </label>

              {amount && (amountError || overBalance) ? (
                <p className={styles.fieldError}>{amountError || overBalance}</p>
              ) : (
                <p className={styles.modalHint}>
                  {formatCurrency(LIMITS[product].min)} to{' '}
                  {formatCurrency(LIMITS[product].max)}
                  {isFd && balance !== null && ` · Available ${formatCurrency(balance)}`}
                </p>
              )}

              {!isFd && (
                <p className={styles.modalHint}>
                  The first instalment is taken now, then monthly.
                </p>
              )}

              <button
                type="button"
                className={styles.modalPrimary}
                onClick={() => setStep(1)}
                disabled={Boolean(amountError || overBalance)}
              >
                Continue
              </button>
            </div>
          )}

          {step === 1 && (
            <div className={styles.modalForm}>
              <div className={styles.termRow}>
                <label className={styles.field}>
                  <span>Years</span>
                  <select
                    value={term.years}
                    onChange={(event) =>
                      setTerm((prev) => ({ ...prev, years: Number(event.target.value) }))
                    }
                  >
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Months</span>
                  <select
                    value={term.months}
                    onChange={(event) =>
                      setTerm((prev) => ({ ...prev, months: Number(event.target.value) }))
                    }
                  >
                    {Array.from({ length: 12 }, (unused, value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {termError ? (
                <p className={styles.fieldError}>{termError}</p>
              ) : (
                <p className={styles.rateCallout}>
                  {slab.label} · <strong>{slab.rate}% p.a.</strong>
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalGhost}
                  onClick={() => setStep(0)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={() => setStep(2)}
                  disabled={Boolean(termError)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.modalForm}>
              <dl className={styles.receipt}>
                <div>
                  <dt>{LIMITS[product].label}</dt>
                  <dd>{formatCurrency(amount)}</dd>
                </div>
                <div>
                  <dt>Tenure</dt>
                  <dd>
                    {term.years ? `${term.years}y ` : ''}
                    {term.months ? `${term.months}m` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Interest rate</dt>
                  <dd>{slab?.rate}% p.a.</dd>
                </div>
                {!isFd && (
                  <div>
                    <dt>Instalments</dt>
                    <dd>{months}</dd>
                  </div>
                )}
              </dl>

              <p className={styles.modalHint}>
                Closing early credits the deposit back after a{' '}
                {rates?.prematureClosurePenaltyPercent ?? 1}% charge.
              </p>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalGhost}
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={cx(styles.modalPrimary)}
                  onClick={submit}
                  disabled={isSubmitting || Boolean(amountError || termError)}
                >
                  {isSubmitting ? 'Opening…' : 'Confirm & Open'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default OpenDepositModal;
