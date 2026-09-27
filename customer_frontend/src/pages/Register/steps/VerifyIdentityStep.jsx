import Button from '../../../components/common/Button/Button';
import TextField from '../../../components/common/TextField/TextField';
import { ArrowRightIcon, MailIcon } from '../../../components/common/Icon/Icon';
import styles from '../Register.module.css';

export const CODE_LENGTH = 6;

/** mm:ss, or an empty string once the code has expired. */
function formatCountdown(seconds) {
  if (seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function VerifyIdentityStep({
  email,
  values,
  errors,
  secondsLeft,
  canResend,
  isSubmitting,
  isResending,
  onChange,
  onBack,
  onSubmit,
  onResend,
}) {
  const isComplete = values.verificationCode.length === CODE_LENGTH;
  const countdown = formatCountdown(secondsLeft);

  return (
    <form className={styles.registerForm} onSubmit={onSubmit} noValidate>
      <div className={styles.verifyStep}>
        <span className={styles.verifyStepBadge}>
          <MailIcon />
        </span>
        <h3 className={styles.verifyStepTitle}>Verify your email</h3>
        <p className={styles.verifyStepText}>
          We&apos;ve sent a {CODE_LENGTH}-digit code to{' '}
          <strong>{email || 'your email address'}</strong>. Enter it below to
          confirm your address.
        </p>
      </div>

      <TextField
        label="Verification Code"
        inputClassName={styles.verifyStepInput}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="______"
        maxLength={CODE_LENGTH}
        value={values.verificationCode}
        error={errors.verificationCode}
        // Digits only, so a pasted "123 456" still lands correctly.
        onChange={(event) =>
          onChange(
            'verificationCode',
            event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
          )
        }
      />

      <p className={styles.verifyStepResend}>
        {countdown ? (
          <>Code expires in {countdown}. </>
        ) : (
          <>Your code has expired. </>
        )}
        <button
          type="button"
          onClick={onResend}
          disabled={!canResend || isResending}
        >
          {isResending ? 'Sending…' : 'Resend code'}
        </button>
      </p>

      <div className={styles.registerFormActions}>
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
          {!isSubmitting && <ArrowRightIcon />}
        </Button>
      </div>
    </form>
  );
}

export default VerifyIdentityStep;
