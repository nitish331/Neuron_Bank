import { CheckIcon } from '../Icon/Icon';
import cx from '../../../utils/classNames';
import styles from './Stepper.module.css';

/**
 * Numbered progress bar for a multi-step flow.
 *
 * Reusable on its own — pass any list of step labels and the active index.
 *
 * @param {{id: string, label: string}[]} steps
 * @param {number} currentStep  Zero-based index of the active step.
 * @param {(index: number) => void} [onStepClick]  Enables going back to a
 *   completed step. Omit to make the bar display-only.
 */
function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <ol
      className={styles.stepper}
      style={{ '--stepper-count': steps.length }}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const canGoBack = Boolean(onStepClick) && isComplete;

        return (
          <li
            key={step.id}
            className={cx(
              styles.stepperStep,
              isComplete && styles.isComplete,
              isCurrent && styles.isCurrent
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {/* Drawn before the marker so it sits behind it. */}
            {index > 0 && <span className={styles.stepperTrack} aria-hidden="true" />}

            <button
              type="button"
              className={styles.stepperMarker}
              onClick={canGoBack ? () => onStepClick(index) : undefined}
              disabled={!canGoBack}
              aria-label={`Step ${index + 1}: ${step.label}`}
            >
              {isComplete ? <CheckIcon /> : index + 1}
            </button>

            <span className={styles.stepperLabel}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
