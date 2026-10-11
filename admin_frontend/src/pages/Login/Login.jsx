import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Logo from '../../components/common/Logo/Logo';
import CredentialsStep from './steps/CredentialsStep';
import VerifyCodeStep, { CODE_LENGTH } from './steps/VerifyCodeStep';
import { login, verifyLoginCode } from '../../services/auth.service';
import { requestPasswordReset } from '../../services/password.service';
import { ApiError } from '../../services/apiClient';
import { sessionStarted } from '../../store/authSlice';
import { validateLoginIdentifier } from '../../utils/validation';
import { ROUTES } from '../../routes/paths';
import styles from './Login.module.css';

const RESEND_COOLDOWN_SECONDS = 30;

const INITIAL_VALUES = { email: '', password: '', code: '' };

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state: routeState } = useLocation();

  const [stage, setStage] = useState('credentials');
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  // Set from the /login response — normalized, so it matches the stored code.
  const [codeEmail, setCodeEmail] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  const identifierError = validateLoginIdentifier(values.email);
  const canSubmitCredentials = !identifierError && values.password.length > 0;

  useEffect(() => {
    if (stage !== 'verify') return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [stage]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
    setFormError('');
  };

  const handleIdentifierBlur = () => {
    setErrors((prev) => ({ ...prev, email: identifierError }));
  };

  const handleApiError = (error, fallbackStage) => {
    if (!(error instanceof ApiError)) {
      setFormError('Something went wrong. Please try again.');
      return;
    }

    setErrors(error.fieldErrors);
    setFormError(error.message);

    // An expired or used-up code cannot be retried — restart the login.
    if (fallbackStage) setStage(fallbackStage);
  };

  const requestCode = async (email, password) => {
    const response = await login({ email, password });
    const minutes = response?.data?.expiresInMinutes ?? 10;

    setCodeEmail(response?.data?.email || email.trim());
    setSecondsLeft(minutes * 60);
    setResendIn(RESEND_COOLDOWN_SECONDS);
  };

  const handleForgotPassword = async () => {
    if (identifierError) {
      setErrors((prev) => ({ ...prev, email: 'Enter your email address first' }));
      return;
    }

    setResetNotice('Sending a reset link…');

    try {
      const response = await requestPasswordReset(values.email);
      setResetNotice(
        response?.message || 'If that email is registered, a reset link is on its way.',
      );
    } catch (error) {
      setResetNotice('');
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmitCredentials) {
      setErrors((prev) => ({ ...prev, email: identifierError }));
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await requestCode(values.email, values.password);
      setValues((prev) => ({ ...prev, code: '' }));
      setStage('verify');
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFormError('');
    setErrors({});

    try {
      await requestCode(values.email, values.password);
      setValues((prev) => ({ ...prev, code: '' }));
    } catch (error) {
      handleApiError(error, 'credentials');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifySubmit = async (event) => {
    event.preventDefault();

    if (values.code.length !== CODE_LENGTH) {
      setErrors((prev) => ({
        ...prev,
        code: `Enter the ${CODE_LENGTH}-digit code`,
      }));
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await verifyLoginCode({
        email: codeEmail,
        code: values.code,
      });

      setValues(INITIAL_VALUES);
      dispatch(sessionStarted(response));
      // The route guard turns a non-admin away; this only opens the door.
      navigate(ROUTES.dashboard, { replace: true });
    } catch (error) {
      // 429 means the attempt limit is spent and the record is gone.
      handleApiError(error, error?.status === 429 ? 'credentials' : undefined);
      setValues((prev) => ({ ...prev, code: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.login}>
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.shell}>
        <section className={styles.pitch}>
          <Logo variant="horizontal" linked={false} />

          <p className={styles.eyebrow}>Admin Portal</p>
          <h1 className={styles.headline}>
            Manage. <span className={styles.accentPink}>Monitor.</span>{' '}
            <span className={styles.accentBlue}>Grow.</span>
          </h1>
          <p className={styles.pitchText}>
            Secure access to the Neuron Bank Admin Panel. Manage users,
            transactions, and banking operations with ease.
          </p>
        </section>

        <section className={styles.card}>
          <Logo variant="horizontal" linked={false} className={styles.cardLogo} />

          <header className={styles.cardHead}>
            <h2>Admin Login</h2>
            <p>Sign in to access the Neuron Bank Admin Panel</p>
          </header>

          {routeState?.reason === 'expired' && !formError && (
            <p className={styles.notice} role="status">
              Your session expired. Please sign in again.
            </p>
          )}

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          {stage === 'credentials' ? (
            <CredentialsStep
              values={values}
              errors={errors}
              resetNotice={resetNotice}
              canSubmit={canSubmitCredentials}
              isSubmitting={isSubmitting}
              onChange={handleChange}
              onBlur={handleIdentifierBlur}
              onForgotPassword={handleForgotPassword}
              onSubmit={handleCredentialsSubmit}
            />
          ) : (
            <VerifyCodeStep
              email={codeEmail}
              values={values}
              errors={errors}
              secondsLeft={secondsLeft}
              canResend={resendIn <= 0}
              isSubmitting={isSubmitting}
              isResending={isResending}
              onChange={handleChange}
              onResend={handleResend}
              onBack={() => {
                setStage('credentials');
                setErrors({});
                setFormError('');
              }}
              onSubmit={handleVerifySubmit}
            />
          )}
        </section>
      </div>
    </main>
  );
}

export default Login;
