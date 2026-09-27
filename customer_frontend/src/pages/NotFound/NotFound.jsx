import Button from '../../components/common/Button/Button';
import Container from '../../components/common/Container/Container';
import { ROUTES } from '../../routes/paths';
import cx from '../../utils/classNames';
import styles from './NotFound.module.css';

/**
 * Catch-all for unknown URLs — and, for now, for the marketing pages that are
 * listed in the header but not built yet.
 */
function NotFound() {
  return (
    <main className={styles.notFound}>
      <Container className={styles.notFoundInner}>
        <p className={cx(styles.notFoundCode, 'u-gradient-text')}>404</p>
        <h1 className={styles.notFoundTitle}>This page isn&apos;t ready yet</h1>
        <p className={styles.notFoundText}>
          The link works — the screen behind it just hasn&apos;t been built.
          Head back home while we finish it off.
        </p>
        <Button variant="primary" size="lg" to={ROUTES.home}>
          Back to home
        </Button>
      </Container>
    </main>
  );
}

export default NotFound;
