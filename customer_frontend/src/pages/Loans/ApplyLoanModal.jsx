import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import Stepper from '../../components/common/Stepper/Stepper';
import {
  loadLoanRates,
  loadLoans,
  selectLoanRates,
  selectRatesStatus,
  selectSubmitError,
  selectSubmitStatus,
  submitLoanRequest,
  submitReset,
} from '../../store/loansSlice';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from './Loans.module.css';

const STEPS = [
  { id: 'amount', label: 'Amount' },
  { id: 'tenure', label: 'Tenure' },
  { id: 'review', label: 'Review' },
];

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 10000000;
const MIN_PURPOSE = 3;
const MAX_PURPOSE = 200;

/** Mirrors createLoanRequestValidation in the backend. */
function validateMoney(value, label, { min = 0, max = MAX_AMOUNT } = {}) {
  const trimmed = String(value).trim();
  if (!trimmed) return `${label} is required`;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return `${label} must have at most 2 decimal places`;
  }

  const amount = Number(trimmed);
  if (amount < min || amount > max) {
    return `${label} must be between ${formatCurrency(min)} and ${formatCurrency(max)}`;
  }
  return '';
}

function ApplyLoanModal({ open, onClose }) {
  const dispatch = useDispatch();
  const rates = useSelector(selectLoanRates);
  const ratesStatus = useSelector(selectRatesStatus);
  const status = useSelector(selectSubmitStatus);
  const error = useSelector(selectSubmitError);

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [tenureMonths, setTenureMonths] = useState(null);
  const [purpose, setPurpose] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;

    dispatch(submitReset());
    setStep(0);
    setAmount('');
    setMonthlyIncome('');
    setTenureMonths(null);
    setPurpose('');
    setResult(null);
  }, [open, dispatch]);

  const amountError = validateMoney(amount, 'Loan amount', { min: MIN_AMOUNT });
  const incomeError = validateMoney(monthlyIncome, 'Monthly income');

  const purposeError =
    purpose.trim().length < MIN_PURPOSE || purpose.trim().length > MAX_PURPOSE
      ? `Purpose must be between ${MIN_PURPOSE} and ${MAX_PURPOSE} characters`
      : '';

  const quote = rates?.tenures?.find((item) => item.months === tenureMonths);
  const isSubmitting = status === 'pending';

  // Quotes are priced against the amount, so refresh them on the way in.
  const goToTenure = () => {
    dispatch(loadLoanRates(Number(amount)));
    setStep(1);
  };

  const submit = async () => {
    const action = await dispatch(
      submitLoanRequest({ amount, purpose, tenureMonths, monthlyIncome }),
    );

    if (submitLoanRequest.fulfilled.match(action)) {
      setResult(action.payload);
      dispatch(loadLoans());
    }
  };

  return (
    <Modal
      open={open}
      title={result ? 'Application submitted' : 'Apply for a loan'}
      onClose={onClose}
    >
      {result ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.modalText}>
            Your request for <strong>{formatCurrency(result.amount)}</strong> is
            with our team for review.
          </p>
          <dl className={styles.receipt}>
            <div>
              <dt>Tenure</dt>
              <dd>{result.tenureMonths} months</dd>
            </div>
            <div>
              <dt>Interest rate</dt>
              <dd>{result.interestRate}% p.a.</dd>
            </div>
            <div>
              <dt>Indicative EMI</dt>
              <dd>{formatCurrency(result.emiAmount)}</dd>
            </div>
            <div>
              <dt>Total payable</dt>
              <dd>{formatCurrency(result.totalPayable)}</dd>
            </div>
          </dl>
          <p className={styles.modalHint}>
            Repayment begins once an admin approves it.
          </p>
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
                <span>Loan amount</span>
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
              {amount && amountError ? (
                <p className={styles.fieldError}>{amountError}</p>
              ) : (
                <p className={styles.modalHint}>
                  {formatCurrency(MIN_AMOUNT)} to {formatCurrency(MAX_AMOUNT)}
                </p>
              )}

              <label className={styles.field}>
                <span>Monthly income</span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={monthlyIncome}
                  onChange={(event) =>
                    setMonthlyIncome(
                      event.target.value.replace(/[^\d.]/g, '').slice(0, 10),
                    )
                  }
                />
              </label>
              {monthlyIncome && incomeError && (
                <p className={styles.fieldError}>{incomeError}</p>
              )}

              <button
                type="button"
                className={styles.modalPrimary}
                onClick={goToTenure}
                disabled={Boolean(amountError || incomeError)}
              >
                Continue
              </button>
            </div>
          )}

          {step === 1 && (
            <div className={styles.modalForm}>
              <p className={styles.modalHint}>
                EMIs shown are for {formatCurrency(amount)}.
              </p>

              {ratesStatus === 'pending' && !rates ? (
                <p className={styles.modalHint}>Loading rates…</p>
              ) : (
                <ul className={styles.tenureList}>
                  {rates?.tenures?.map((item) => (
                    <li key={item.months}>
                      <button
                        type="button"
                        className={cx(
                          styles.tenureOption,
                          tenureMonths === item.months && styles.tenureOn,
                        )}
                        onClick={() => setTenureMonths(item.months)}
                      >
                        <span className={styles.tenureLabel}>
                          {item.label}
                          <small>{item.rate}% p.a.</small>
                        </span>
                        {item.emiAmount != null && (
                          <span className={styles.tenureEmi}>
                            {formatCurrency(item.emiAmount)}
                            <small>per month</small>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
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
                  disabled={!tenureMonths}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.modalForm}>
              <label className={styles.field}>
                <span>What is this loan for?</span>
                <input
                  type="text"
                  maxLength={MAX_PURPOSE}
                  placeholder="Home renovation, education, business…"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                />
              </label>
              {purpose && purposeError && (
                <p className={styles.fieldError}>{purposeError}</p>
              )}

              <dl className={styles.receipt}>
                <div>
                  <dt>Loan amount</dt>
                  <dd>{formatCurrency(amount)}</dd>
                </div>
                <div>
                  <dt>Tenure</dt>
                  <dd>{quote?.label}</dd>
                </div>
                <div>
                  <dt>Interest rate</dt>
                  <dd>{quote?.rate}% p.a.</dd>
                </div>
                {quote?.emiAmount != null && (
                  <>
                    <div>
                      <dt>Monthly EMI</dt>
                      <dd>{formatCurrency(quote.emiAmount)}</dd>
                    </div>
                    <div>
                      <dt>Total payable</dt>
                      <dd>{formatCurrency(quote.totalPayable)}</dd>
                    </div>
                  </>
                )}
              </dl>

              <p className={styles.modalHint}>
                Once approved, EMIs are debited from your account automatically on
                each due date.
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
                  className={styles.modalPrimary}
                  onClick={submit}
                  disabled={isSubmitting || Boolean(purposeError)}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit application'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default ApplyLoanModal;
