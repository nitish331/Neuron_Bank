import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../Icon/Icon';
import cx from '../../../utils/classNames';
import styles from './TextField.module.css';

/**
 * Labelled input with a leading icon, error state and optional password reveal.
 *
 * @param {React.ComponentType} [icon]  Leading icon component.
 * @param {string} [error]  Message to show; also puts the field in its error state.
 * @param {string} [hint]  Helper text, hidden while an error is showing.
 * @param {React.ReactNode} [addon]  Rendered before the input (e.g. dial code select).
 * @param {string} [inputClassName]  Extra class for the <input> itself. Scoped
 *   styles can't reach inside another module, so callers that need to restyle
 *   the input (e.g. the verification code field) pass their own class here.
 */
function TextField({
  label,
  icon: Icon,
  error,
  hint,
  addon,
  type = 'text',
  className = '',
  inputClassName = '',
  ...inputProps
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const resolvedType = isPassword && revealed ? 'text' : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cx(styles.textField, className)}>
      <label className={styles.textFieldLabel} htmlFor={id}>
        {label}
      </label>

      <div
        className={cx(styles.textFieldControl, error && styles.isInvalid)}
      >
        {addon}

        <span className={styles.textFieldIconWrap}>
          {Icon && <Icon className={styles.textFieldIcon} />}
          <input
            {...inputProps}
            id={id}
            type={resolvedType}
            className={cx(styles.textFieldInput, inputClassName)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
        </span>

        {isPassword && (
          <button
            type="button"
            className={styles.textFieldReveal}
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {error ? (
        <p className={styles.textFieldError} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p className={styles.textFieldHint} id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default TextField;
