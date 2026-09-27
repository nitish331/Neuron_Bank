import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import Logo from '../../components/common/Logo/Logo';
import { resetCardPin } from '../../services/card.service';
import { ApiError } from '../../services/apiClient';
import { ROUTES } from '../../routes/paths';
import cx from '../../utils/classNames';
import styles from './SetCardPin.module.css';

const PIN_LENGTH = 4;

/** Mirrors pinValidation() in backend/middleware/debitCard.validation.js. */
function validatePin(pin) {
  if (pin.length !== PIN_LENGTH) return `PIN must be ${PIN_LENGTH} digits`;
  if (/^(\d)\1{3}$/.test(pin)) return 'PIN must not be the same digit four times';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) {
    return 'PIN must not be four digits in a row';
  }
  return '';
}

function SetCardPin() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const pinError = validatePin(pin);
  const confirmError = pin !== confirmPin ? 'PINs do not match' : '';
  const canSubmit = !pinError && !confirmError && !isSubmitting;

  const onlyDigits = (value) =>
    value.replace(/\D/g, '').slice(0, PIN_LENGTH);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await resetCardPin({ token, pin, confirmPin });
      setIsDone(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Logo variant="horizontal" />

        {!token && (
          <>
            <span className={cx(styles.badge, styles.badgeWarn)} aria-hidden="true">
              <ShieldAlert size={28} />
            </span>
            <h1 className={styles.title}>Link not valid</h1>
            <p className={styles.text}>
              This page needs the link from your email. Request a new one from the
              Debit Cards screen.
            </p>
            <Link to={ROUTES.login} className={styles.primaryLink}>
              Back to sign in
            </Link>
          </>
        )}

        {token && isDone && (
          <>
            <span className={cx(styles.badge, styles.badgeGood)} aria-hidden="true">
              <CheckCircle2 size={28} />
            </span>
            <h1 className={styles.title}>PIN updated</h1>
            <p className={styles.text}>
              Your new card PIN is ready to use at ATMs and payment terminals.
            </p>
            <Link to={ROUTES.dashboardCards} className={styles.primaryLink}>
              Back to my card
            </Link>
          </>
        )}

        {token && !isDone && (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>Set a new card PIN</h1>
              <p className={styles.text}>
                Choose four digits you have not used before.
              </p>
            </header>

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label className={styles.field}>
                <span>New PIN</span>
                <input
                  className={styles.pinInput}
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  placeholder="····"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onBlur={() => setTouched(true)}
                  onChange={(event) => setPin(onlyDigits(event.target.value))}
                />
              </label>
              {touched && pinError && <p className={styles.fieldError}>{pinError}</p>}

              <label className={styles.field}>
                <span>Confirm PIN</span>
                <input
                  className={styles.pinInput}
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  placeholder="····"
                  maxLength={PIN_LENGTH}
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(onlyDigits(event.target.value))}
                />
              </label>
              {touched && confirmError && (
                <p className={styles.fieldError}>{confirmError}</p>
              )}

              {/* Gated until both fields satisfy the server's own PIN rules. */}
              <button type="submit" className={styles.submit} disabled={!canSubmit}>
                {isSubmitting ? 'Updating…' : 'Set PIN'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default SetCardPin;
