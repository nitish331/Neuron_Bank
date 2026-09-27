import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { sessionStarted } from '../../store/authSlice';
import Logo from '../../components/common/Logo/Logo';
import Stepper from '../../components/common/Stepper/Stepper';
import {
  BoltIcon,
  ChartIcon,
  LockIcon,
  ShieldIcon,
} from '../../components/common/Icon/Icon';
import PersonalDetailsStep from './steps/PersonalDetailsStep';
import VerifyIdentityStep, { CODE_LENGTH } from './steps/VerifyIdentityStep';
import SetPasswordStep from './steps/SetPasswordStep';
import {
  register,
  sendVerificationCode,
  verifyEmailCode,
} from '../../services/auth.service';
import { ApiError } from '../../services/apiClient';
import { ROUTES } from '../../routes/paths';
import registerArt from '../../assets/images/register-art.png';
import {
  isClean,
  validateConfirmPassword,
  validateDateOfBirth,
  validateEmail,
  validateFullName,
  validateName,
  validatePassword,
  validatePhoneNumber,
} from '../../utils/validation';
import styles from './Register.module.css';

const STEPS = [
  { id: 'details', label: 'Personal Details' },
  { id: 'verify', label: 'Verify Identity' },
  { id: 'password', label: 'Set Password' },
];

const BENEFITS = [
  {
    icon: ShieldIcon,
    title: '100% Secure',
    body: 'Bank with industry-leading security and privacy.',
  },
  {
    icon: BoltIcon,
    title: 'Instant Access',
    body: 'Open your account in minutes and start banking instantly.',
  },
  {
    icon: ChartIcon,
    title: 'Smart Banking',
    body: 'AI-powered insights to help you save, invest and grow.',
  },
];

const INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  dialCode: '+91',
  phoneNumber: '',
  dateOfBirth: '',
  acceptedTerms: false,
  verificationCode: '',
  password: '',
  confirmPassword: '',
};

/** Maps the backend's field names onto the form's. */
const FIELD_ALIASES = { name: 'firstName' };

const RESEND_COOLDOWN_SECONDS = 30;

const DETAIL_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'dateOfBirth',
];

function Register() {
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Normalized by the backend, so it matches the stored verification record.
  const [codeEmail, setCodeEmail] = useState('');
  // The address that currently holds a verified record, '' once it lapses.
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (step !== 1) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
    setFormError('');
  };

  const validateDetails = () => ({
    firstName: validateName(values.firstName, 'First name'),
    lastName: validateName(values.lastName, 'Last name'),
    email: validateEmail(values.email),
    phoneNumber: validatePhoneNumber(values.dialCode, values.phoneNumber),
    dateOfBirth: validateDateOfBirth(values.dateOfBirth),
    // Guards the combined 2-100 char limit the backend enforces on `name`.
    ...(validateFullName(values.firstName, values.lastName)
      ? { lastName: validateFullName(values.firstName, values.lastName) }
      : {}),
  });

  const requestCode = async (email) => {
    const response = await sendVerificationCode(email);

    setCodeEmail(response?.data?.email || email.trim());
    setSecondsLeft((response?.data?.expiresInMinutes ?? 10) * 60);
    setResendIn(RESEND_COOLDOWN_SECONDS);
    setValues((prev) => ({ ...prev, verificationCode: '' }));
  };

  const handleApiError = (error, { field, step: fallbackStep } = {}) => {
    if (!(error instanceof ApiError)) {
      setFormError('Something went wrong. Please try again.');
      return;
    }

    // 403/409/429 carry only a message, so the caller says where it belongs.
    const mapped = Object.entries(error.fieldErrors).reduce(
      (acc, [name, message]) => {
        acc[FIELD_ALIASES[name] || name] = message;
        return acc;
      },
      {},
    );

    if (field && !Object.keys(mapped).length) mapped[field] = error.message;

    setErrors(mapped);
    setFormError(error.message);

    if (DETAIL_FIELDS.some((name) => mapped[name])) setStep(0);
    else if (fallbackStep !== undefined) setStep(fallbackStep);
  };

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateDetails();
    setErrors(nextErrors);
    if (!isClean(nextErrors)) return;

    // Coming back without touching the email keeps the existing verification.
    if (verifiedEmail && verifiedEmail === values.email.trim()) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setVerifiedEmail('');

    try {
      await requestCode(values.email);
      setStep(1);
    } catch (error) {
      handleApiError(error, { field: 'email' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setFormError('');
    setErrors({});

    try {
      await requestCode(values.email);
    } catch (error) {
      handleApiError(error, { field: 'email' });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifySubmit = async (event) => {
    event.preventDefault();

    if (values.verificationCode.length !== CODE_LENGTH) {
      setErrors((prev) => ({
        ...prev,
        verificationCode: `Enter the ${CODE_LENGTH}-digit code`,
      }));
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await verifyEmailCode({
        email: codeEmail,
        code: values.verificationCode,
      });

      setVerifiedEmail(values.email.trim());
      setStep(2);
    } catch (error) {
      // 429 spends the record, so only a fresh code can get past this.
      handleApiError(error, { field: 'verificationCode' });
      setValues((prev) => ({ ...prev, verificationCode: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      password: validatePassword(values.password),
      confirmPassword: validateConfirmPassword(
        values.password,
        values.confirmPassword,
      ),
    };
    setErrors(nextErrors);
    if (!isClean(nextErrors)) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      dispatch(sessionStarted(await register(values)));
      setIsDone(true);
    } catch (error) {
      // 403 means the verified window lapsed — re-send and go back to the code.
      if (error instanceof ApiError && error.status === 403) {
        setVerifiedEmail('');
        setStep(1);

        try {
          await requestCode(values.email);
          setFormError(error.message);
        } catch (resendError) {
          handleApiError(resendError, { field: 'email' });
        }
      } else {
        handleApiError(error, { field: 'email' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // The pitch panel would stretch this to its own height, so it stands alone.
  if (isDone) {
    return (
      <main className={styles.register}>
        <div className={styles.registerGlow} aria-hidden="true" />

        <div className={styles.registerDoneShell}>
          <Logo variant="horizontal" />

          <span className={styles.registerDoneBadge}>
            <ShieldIcon />
          </span>

          <h1>Account requested</h1>
          <p>
            Thanks {values.firstName}. We&apos;ve received your application and
            an admin will review it shortly.
          </p>

          <div className={styles.registerDoneActions}>
            <Link to={ROUTES.home} className={styles.registerDoneLink}>
              Back to home
            </Link>
            <Link to={ROUTES.login} className={styles.registerDoneLink}>
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.register}>
      <div className={styles.registerGlow} aria-hidden="true" />

      <div className={styles.registerShell}>
        {/* ---------- Left: brand panel ---------- */}
        <section className={styles.registerAside}>
          <Logo variant="horizontal" />

          <div >
            <h1 className={styles.registerTitle}>
              Create your
              <br />
              <span className={'u-gradient-text'}>NeurON</span> Account
            </h1>
            <p className={styles.registerSubtitle}>
              Join Neuron Bank and experience smarter, faster, and more secure
              banking.
            </p>
          </div>

          <ul className={styles.registerBenefits}>
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <li key={title} className={styles.registerBenefit}>
                <span className={styles.registerBenefitIcon}>
                  <Icon />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <img src={registerArt} alt="" className={styles.registerArt} />

          <div className={styles.registerAssurances}>
            <div>
              <span className={styles.registerBenefitIcon}>
                <ShieldIcon />
              </span>
              <div>
                <h2>Your data is safe with us.</h2>
                <p>We never share your information with anyone.</p>
              </div>
            </div>
            <div>
              <span className={styles.registerBenefitIcon}>
                <LockIcon />
              </span>
              <div>
                <h2>256-bit Encryption</h2>
                <p>All your data is secured with bank-level encryption.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Right: the form ---------- */}
        <section className={styles.registerPanel}>
          <header className={styles.registerPanelHead}>
            <h2>Let&apos;s get you started</h2>
            <p>Fill in your details to create your account</p>
          </header>

          <Stepper
            steps={STEPS}
            currentStep={step}
            onStepClick={isSubmitting ? undefined : setStep}
          />

          {formError && (
            <p className={styles.registerFormError} role="alert">
              {formError}
            </p>
          )}

          {step === 0 && (
            <PersonalDetailsStep
              values={values}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={handleChange}
              onSubmit={handleDetailsSubmit}
            />
          )}

          {step === 1 && (
            <VerifyIdentityStep
              email={codeEmail || values.email}
              values={values}
              errors={errors}
              secondsLeft={secondsLeft}
              canResend={resendIn <= 0}
              isSubmitting={isSubmitting}
              isResending={isResending}
              onChange={handleChange}
              onBack={() => setStep(0)}
              onSubmit={handleVerifySubmit}
              onResend={handleResend}
            />
          )}

          {step === 2 && (
            <SetPasswordStep
              values={values}
              errors={errors}
              onChange={handleChange}
              onBack={() => setStep(1)}
              onSubmit={handlePasswordSubmit}
              isSubmitting={isSubmitting}
            />
          )}

          <p className={styles.registerSignin}>
            Already have an account? <Link to={ROUTES.login}>Sign In</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default Register;
