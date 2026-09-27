import TextField from '../../../components/common/TextField/TextField';
import Button from '../../../components/common/Button/Button';
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../../../components/common/Icon/Icon';
import styles from '../Register.module.css';

const DIAL_CODES = ['+91', '+1', '+44', '+61', '+971'];

/** Step 1 — the fields the backend actually stores, minus the password. */
function PersonalDetailsStep({ values, errors, isSubmitting, onChange, onSubmit }) {
  const field = (name) => ({
    value: values[name],
    error: errors[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  return (
    <form className={styles.registerForm} onSubmit={onSubmit} noValidate>
      <div className={styles.registerFormRow}>
        <TextField
          label="First Name"
          icon={UserIcon}
          placeholder="Enter first name"
          autoComplete="given-name"
          {...field('firstName')}
        />
        <TextField
          label="Last Name"
          icon={UserIcon}
          placeholder="Enter last name"
          autoComplete="family-name"
          {...field('lastName')}
        />
      </div>

      <TextField
        label="Email Address"
        icon={MailIcon}
        type="email"
        placeholder="Enter your email address"
        autoComplete="email"
        {...field('email')}
      />

      <TextField
        label="Mobile Number"
        icon={PhoneIcon}
        type="tel"
        inputMode="numeric"
        placeholder="Enter mobile number"
        autoComplete="tel-national"
        addon={
          <span className={styles.dialCode}>
            <select
              className={styles.dialCodeSelect}
              value={values.dialCode}
              onChange={(event) => onChange('dialCode', event.target.value)}
              aria-label="Country dialling code"
            >
              {DIAL_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <ChevronDownIcon className={styles.dialCodeChevron} />
          </span>
        }
        {...field('phoneNumber')}
      />

      <TextField
        label="Date of Birth"
        icon={CalendarIcon}
        type="date"
        autoComplete="bday"
        max={new Date().toISOString().slice(0, 10)}
        {...field('dateOfBirth')}
      />

      <label className={styles.registerFormConsent}>
        <input
          type="checkbox"
          checked={values.acceptedTerms}
          onChange={(event) => onChange('acceptedTerms', event.target.checked)}
        />
        <span>
          I agree to the <a href="/terms">Terms &amp; Conditions</a> and{' '}
          <a href="/privacy">Privacy Policy</a>
        </span>
      </label>
      {/* Nothing can be submitted until the terms are accepted. */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className={styles.registerFormSubmit}
        disabled={!values.acceptedTerms || isSubmitting}
      >
        {isSubmitting ? 'Sending code…' : 'Continue'}
        {!isSubmitting && <ArrowRightIcon />}
      </Button>
    </form>
  );
}

export default PersonalDetailsStep;
