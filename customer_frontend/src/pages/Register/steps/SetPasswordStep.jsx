import Button from '../../../components/common/Button/Button';
import TextField from '../../../components/common/TextField/TextField';
import {
  ArrowRightIcon,
  CheckIcon,
  LockIcon,
} from '../../../components/common/Icon/Icon';
import { PASSWORD_RULES } from '../../../utils/validation';
import cx from '../../../utils/classNames';
import styles from '../Register.module.css';

/**
 * Step 3 — sets the password and fires the one and only POST /register with
 * everything collected across the wizard.
 */
function SetPasswordStep({ values, errors, onChange, onBack, onSubmit, isSubmitting }) {
  const field = (name) => ({
    value: values[name],
    error: errors[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  return (
    <form className={styles.registerForm} onSubmit={onSubmit} noValidate>
      <TextField
        label="Password"
        icon={LockIcon}
        type="password"
        placeholder="Create a password"
        autoComplete="new-password"
        {...field('password')}
      />

      {/* Live checklist so the strength rules aren't a guessing game. */}
      <ul className={styles.passwordRules}>
        {PASSWORD_RULES.map((rule) => {
          const met = rule.test(values.password);
          return (
            <li
              key={rule.id}
              className={cx(styles.passwordRulesItem, met && styles.isMet)}
            >
              <CheckIcon />
              {rule.label}
            </li>
          );
        })}
      </ul>

      <TextField
        label="Confirm Password"
        icon={LockIcon}
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        {...field('confirmPassword')}
      />

      <div className={styles.registerFormActions}>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create Account'}
          {!isSubmitting && <ArrowRightIcon />}
        </Button>
      </div>
    </form>
  );
}

export default SetPasswordStep;
