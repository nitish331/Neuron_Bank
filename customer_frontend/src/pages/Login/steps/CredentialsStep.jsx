import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button/Button';
import TextField from '../../../components/common/TextField/TextField';
import {
  ArrowRightIcon,
  LockIcon,
  MailIcon,
} from '../../../components/common/Icon/Icon';
import { ROUTES } from '../../../routes/paths';
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
        label="Email Address"
        icon={MailIcon}
        type="email"
        name="email"
        autoComplete="username"
        placeholder="Enter your email address"
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
        {isSubmitting ? 'Sending code…' : 'Log In'}
        {!isSubmitting && <ArrowRightIcon />}
      </Button>

      <p className={styles.loginFormDivider}>
        <span>Don&apos;t have an account?</span>
      </p>

      <Link to={ROUTES.register} className={styles.loginFormCreate}>
        Create Account
        <ArrowRightIcon />
      </Link>
    </form>
  );
}

export default CredentialsStep;
