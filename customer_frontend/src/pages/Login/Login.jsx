import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { sessionStarted } from '../../store/authSlice';
import Logo from '../../components/common/Logo/Logo';
import AccountStatus from '../AccountStatus/AccountStatus';
import { accessState } from '../../utils/accountAccess';
import CredentialsStep from './steps/CredentialsStep';
import VerifyCodeStep, { CODE_LENGTH } from './steps/VerifyCodeStep';
import { login, verifyLoginCode } from '../../services/auth.service';
import { requestPasswordReset } from '../../services/password.service';
import { ApiError } from '../../services/apiClient';
import { ROUTES } from '../../routes/paths';
import { validateLoginIdentifier } from '../../utils/validation';
import cx from '../../utils/classNames';
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
  const [session, setSession] = useState(null);

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

  const requestCode = async (email, password) => {
    const response = await login({ email, password });
    const minutes = response?.data?.expiresInMinutes ?? 10;

    setCodeEmail(response?.data?.email || email.trim());
    setSecondsLeft(minutes * 60);
    setResendIn(RESEND_COOLDOWN_SECONDS);
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

      // An active account has nothing to read here — send it straight through.
      if (!accessState(response.data)) {
        navigate(ROUTES.dashboard, { replace: true });
        return;
      }

      setSession(response.data);
      setStage('done');
    } catch (error) {
      // 429 means the attempt limit is spent and the record is gone.
      handleApiError(error, error?.status === 429 ? 'credentials' : undefined);
      setValues((prev) => ({ ...prev, code: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const blockedState = accessState(session);

  return (
    <main className={styles.login}>
      <div className={styles.loginBackdrop} aria-hidden="true" />
      <div className={styles.loginGlow} aria-hidden="true" />

      <header className={styles.loginRail}>
        <Logo variant="horizontal" />
      </header>

      <div className={styles.loginStage}>
        <section className={styles.loginPitch}>
          <h1 className={styles.loginHeadline}>
            Banking
            <br />
            for a brighter
            <br />
            <span className={'u-gradient-text'}>Tomorrow</span>
          </h1>
          <span className={styles.loginRule} aria-hidden="true" />
          <p className={styles.loginPitchText}>
            Secure. Smart. Seamless.
            <br />
            Always with you.
          </p>
        </section>

        <section className={styles.loginCard}>
          {stage === 'done' && blockedState ? (
            <AccountStatus
              state={blockedState}
              name={session?.name}
              standalone={false}
            />
          ) : (
            <>
              <Logo variant="horizontal" linked={false} className={styles.loginCardLogo} />

              <header className={styles.loginCardHead}>
                <h2>
                  Welcome <span className={'u-gradient-text'}>Back</span>
                </h2>
                <p>Log in to your account to continue your financial journey.</p>
              </header>

              {routeState?.reason === 'expired' && !formError && (
                <p className={styles.loginNotice} role="status">
                  Your session expired. Please sign in again.
                </p>
              )}

              {formError && (
                <p className={styles.loginFormError} role="alert">
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
            </>
          )}
        </section>
      </div>

      <footer className={cx(styles.loginRail, styles.loginRailBottom)}>
        <p className={styles.loginTrust}>
          Trusted by millions
          <br />
          for a smarter tomorrow.
        </p>
        <p className={styles.loginMotto}>
          Smart People
          <br />
          Build Brighter Futures
        </p>
      </footer>
    </main>
  );
}

export default Login;
