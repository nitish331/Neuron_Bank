import { Link } from 'react-router-dom';
import cx from '../../../utils/classNames';
import styles from './Button.module.css';

/* Scoped class names can't be interpolated, so variants and sizes are looked up. */
const VARIANT_CLASSES = {
  primary: styles.btnPrimary,
  ghost: styles.btnGhost,
  subtle: styles.btnSubtle,
};

const SIZE_CLASSES = {
  sm: styles.btnSm,
  md: styles.btnMd,
  lg: styles.btnLg,
};

/**
 * The one button in the design system.
 *
 * Renders a <Link> when given `to`, an <a> when given `href`, otherwise a
 * <button> — so a call to action never has to choose between looking right and
 * being the correct element.
 *
 * @param {'primary'|'ghost'|'subtle'} variant
 * @param {'sm'|'md'|'lg'} size
 */
function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  className = '',
  children,
  ...rest
}) {
  const classes = cx(
    styles.btn,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
