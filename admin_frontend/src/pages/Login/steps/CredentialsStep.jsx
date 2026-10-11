import Button from '../../../components/common/Button/Button';
import TextField from '../../../components/common/TextField/TextField';
import {
  ArrowRightIcon,
  LockIcon,
  MailIcon,
} from '../../../components/common/Icon/Icon';
import styles from '../Login.module.css';

function CredentialsStep({
  values,
  errors,
  resetNotice,
  canSubmit,
  isSubmitting,
  onChange,
  onBlur,
  onForgotPassword,
  onSubmit,
}) {
  return (
    <form className={styles.loginForm} onSubmit={onSubmit} noValidate>
      <TextField
        label="Admin Email"
        icon={MailIcon}
        type="email"
        name="email"
        autoComplete="username"
        placeholder="admin@neuronbank.com"
        value={values.email}
        error={errors.email}
        onChange={(event) => onChange('email', event.target.value)}
        onBlur={onBlur}
      />

      <div className={styles.loginFormPassword}>
        <TextField
          label="Password"
          icon={LockIcon}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={values.password}
          error={errors.password}
          onChange={(event) => onChange('password', event.target.value)}
        />
        <button
          type="button"
          className={styles.loginFormForgot}
          onClick={onForgotPassword}
        >
          Forgot Password?
        </button>
      </div>

      {resetNotice && (
        <p className={styles.loginFormNote} role="status">
          {resetNotice}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={styles.loginFormSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? 'Sending code…' : 'Login'}
        {!isSubmitting && <ArrowRightIcon />}
      </Button>

    </form>
  );
}

export default CredentialsStep;
