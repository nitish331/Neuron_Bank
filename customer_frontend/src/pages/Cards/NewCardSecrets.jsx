import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Copy, Eye, EyeOff } from 'lucide-react';
import { secretsDismissed, selectFreshSecrets } from '../../store/cardsSlice';
import styles from './Cards.module.css';

function group(cardNumber) {
  return String(cardNumber).replace(/(.{4})/g, '$1 ').trim();
}

// Issuance confirmation, not a last chance: the eye on Card Details re-reads these.
function NewCardSecrets() {
  const dispatch = useDispatch();
  const secrets = useSelector(selectFreshSecrets);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!secrets) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secrets.cardNumber);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={styles.secrets} role="status">
      <span className={styles.secretsIcon} aria-hidden="true">
        <CheckCircle2 size={22} />
      </span>

      <div className={styles.secretsBody}>
        <h2 className={styles.secretsTitle}>Your new card is ready</h2>
        <p className={styles.secretsText}>
          Here are the full details. You can see them again any time from Card
          Details below, so there is no need to write them down.
        </p>

        <dl className={styles.secretsGrid}>
          <div>
            <dt>Card number</dt>
            <dd className={styles.secretValue}>
              {revealed ? group(secrets.cardNumber) : '•••• •••• •••• ••••'}
            </dd>
          </div>
          <div>
            <dt>CVV</dt>
            <dd className={styles.secretValue}>
              {revealed ? secrets.cvv : '•••'}
            </dd>
          </div>
        </dl>

        <div className={styles.secretsActions}>
          <button
            type="button"
            className={styles.secretsGhost}
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          <button type="button" className={styles.secretsGhost} onClick={copy}>
            <Copy size={16} aria-hidden="true" />
            {copied ? 'Copied' : 'Copy number'}
          </button>
          <button
            type="button"
            className={styles.secretsPrimary}
            onClick={() => dispatch(secretsDismissed())}
          >
            Got it
          </button>
        </div>
      </div>
    </section>
  );
}

export default NewCardSecrets;
