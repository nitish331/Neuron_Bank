import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import Logo from '../../components/common/Logo/Logo';
import TextField from '../../components/common/TextField/TextField';
import { resetPassword } from '../../services/password.service';
import { ApiError } from '../../services/apiClient';
import { sessionEnded } from '../../store/authSlice';
import { ROUTES } from '../../routes/paths';
import {
  isClean,
  PASSWORD_RULES,
  validateConfirmPassword,
  validatePassword,
} from '../../utils/validation';
import cx from '../../utils/classNames';
import styles from './ResetPassword.module.css';

function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const token = params.get('token') || '';
  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const passwordError = validatePassword(values.password);
  const confirmError = validateConfirmPassword(
    values.password,
    values.confirmPassword,
  );
  const canSubmit = !passwordError && !confirmError && !isSubmitting;

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = { password: passwordError, confirmPassword: confirmError };
    setErrors(nextErrors);
    if (!isClean(nextErrors)) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await resetPassword({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      // The server revoked every refresh token, so drop any local session too.
      dispatch(sessionEnded());
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
              This page needs a reset link from your email. Request a new one from
              the sign-in screen.
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
            <h1 className={styles.title}>Password updated</h1>
            <p className={styles.text}>
              You have been signed out everywhere. Sign in with your new password.
            </p>
            <button
              type="button"
              className={styles.submit}
              onClick={() => navigate(ROUTES.login, { replace: true })}
            >
              Go to sign in
            </button>
          </>
        )}

        {token && !isDone && (
          <>
            <header className={styles.head}>
              <h1 className={styles.title}>Set a new password</h1>
              <p className={styles.text}>
                Choose a password you have not used before.
              </p>
            </header>

            {formError && (
              <p className={styles.formError} role="alert">
                {formError}
              </p>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <TextField
                label="New Password"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                placeholder="Enter your new password"
                value={values.password}
                error={errors.password}
                onChange={(event) => handleChange('password', event.target.value)}
              />

              <ul className={styles.rules}>
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.id}
                    className={cx(
                      styles.rule,
                      rule.test(values.password) && styles.ruleMet,
                    )}
                  >
                    {rule.label}
                  </li>
                ))}
              </ul>

              <TextField
                label="Confirm Password"
                icon={Lock}
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                value={values.confirmPassword}
                error={errors.confirmPassword}
                onChange={(event) =>
                  handleChange('confirmPassword', event.target.value)
                }
              />

              {/* Gated until both fields satisfy the server's own rules. */}
              <button type="submit" className={styles.submit} disabled={!canSubmit}>
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default ResetPassword;
