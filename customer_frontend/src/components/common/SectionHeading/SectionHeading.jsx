import cx from '../../../utils/classNames';
import styles from './SectionHeading.module.css';

/* Scoped class names can't be interpolated, so alignments are looked up. */
const ALIGN_CLASSES = {
  center: styles.sectionHeadingCenter,
  start: styles.sectionHeadingStart,
};

/**
 * The eyebrow / title / subtitle block that opens each marketing section.
 *
 * `children` is the title. Pass one <span> per line — they render as blocks —
 * and wrap any highlighted words in `u-gradient-text`.
 *
 * @param {'center'|'start'} align  Centred by default; `start` left-aligns.
 * @param {React.ComponentType} [eyebrowIcon]  Small icon inside the pill.
 */
function SectionHeading({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  subtitle,
  align = 'center',
  children,
  className = '',
}) {
  return (
    <header
      className={cx(styles.sectionHeading, ALIGN_CLASSES[align], className)}
    >
      {eyebrow && (
        <p className={styles.sectionHeadingEyebrow}>
          {EyebrowIcon && <EyebrowIcon />}
          {eyebrow}
        </p>
      )}
      <h2 className={styles.sectionHeadingTitle}>{children}</h2>
      {subtitle && <p className={styles.sectionHeadingSubtitle}>{subtitle}</p>}
    </header>
  );
}

export default SectionHeading;
