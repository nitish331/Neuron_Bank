import { useSelector } from 'react-redux';
import SupportForm from '../../components/support/SupportForm/SupportForm';
import { selectUser } from '../../store/authSlice';
import styles from './Support.module.css';

/**
 * Shared by the dashboard route and the public one. `standalone` adds the
 * page padding the dashboard shell already provides.
 */
function Support({ standalone = false }) {
  const user = useSelector(selectUser);

  return (
    <main className={standalone ? styles.standalone : styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.inner}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            Help &amp; <span className="u-gradient-text">Support</span>
          </h1>
          <p className={styles.subtitle}>
            Tell us about your issue or query. Our support team will get back to
            you as soon as possible.
          </p>
        </header>

        <SupportForm defaultEmail={user?.email || ''} />
      </div>
    </main>
  );
}

export default Support;
