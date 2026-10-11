import { Link } from 'react-router-dom';
import logoHorizontal from '../../../assets/images/logo-horizontal.png';
import logoMark from '../../../assets/images/logo-mark.png';
import { ROUTES } from '../../../routes/paths';
import cx from '../../../utils/classNames';
import styles from './Logo.module.css';

const SOURCES = {
  horizontal: logoHorizontal,
  mark: logoMark,
};

/* Scoped class names can't be interpolated, so variants are looked up. */
const VARIANT_CLASSES = {
  horizontal: styles.logoHorizontal,
  mark: styles.logoMark,
};

/**
 * Brand lockup. `mark` is the standalone N, `horizontal` is the mark plus
 * wordmark. Both assets are white-on-transparent, so they need a dark surface.
 *
 * @param {'horizontal'|'mark'} variant
 * @param {boolean} linked  Wrap in a link back to the homepage.
 */
function Logo({ variant = 'horizontal', linked = true, className = '' }) {
  const image = (
    <img
      src={SOURCES[variant]}
      alt="Neuron Bank"
      className={cx(styles.logo, VARIANT_CLASSES[variant], className)}
      width={variant === 'mark' ? 44 : 168}
      height={44}
    />
  );

  if (!linked) return image;

  return (
    <Link to={ROUTES.home} className={styles.logoLink} aria-label="Neuron Bank — home">
      {image}
    </Link>
  );
}

export default Logo;
