import cx from '../../../utils/classNames';
import styles from './Container.module.css';

/**
 * Centres content at the shared max width and applies the page gutter.
 * Use this instead of hand-rolling `max-width` on individual sections.
 */
function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={cx(styles.container, className)} {...rest}>
      {children}
    </Tag>
  );
}

export default Container;
