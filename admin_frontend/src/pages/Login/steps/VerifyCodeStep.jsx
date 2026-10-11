import Button from '../../../components/common/Button/Button';
import TextField from '../../../components/common/TextField/TextField';
import {
  ArrowRightIcon,
  MailIcon,
} from '../../../components/common/Icon/Icon';
import styles from '../Login.module.css';

export const CODE_LENGTH = 6;

/** mm:ss, or an empty string once the code has expired. */
function formatCountdown(seconds) {
  if (seconds <= 0) return '';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function VerifyCodeStep({
  email,
  values,
  errors,
  secondsLeft,
  canResend,
  isSubmitting,
  isResending,
  onChange,
  onResend,
  onBack,
  onSubmit,
}) {
  const isComplete = values.code.length === CODE_LENGTH;
  const countdown = formatCountdown(secondsLeft);

  return (
    <form className={styles.loginForm} onSubmit={onSubmit} noValidate>
      <div className={styles.loginVerify}>
        <span className={styles.loginVerifyBadge}>
          <MailIcon />
        </span>
        <h3 className={styles.loginVerifyTitle}>Check your email</h3>
        <p className={styles.loginVerifyText}>
          We sent a {CODE_LENGTH}-digit login code to <strong>{email}</strong>.
          Enter it below to finish signing in.
        </p>
      </div>

      <TextField
        label="Login Code"
        inputClassName={styles.loginVerifyInput}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="______"
        maxLength={CODE_LENGTH}
        value={values.code}
        error={errors.code}
        onChange={(event) =>
          onChange(
            'code',
            event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
          )
        }
      />

      <p className={styles.loginVerifyResend}>
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

      <div className={styles.loginFormActions}>
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isComplete || isSubmitting}
        >
          {isSubmitting ? 'Verifying…' : 'Verify & Log In'}
          {!isSubmitting && <ArrowRightIcon />}
        </Button>
      </div>
    </form>
  );
}

export default VerifyCodeStep;
