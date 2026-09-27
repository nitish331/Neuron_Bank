import Button from '../../../../components/common/Button/Button';
import Container from '../../../../components/common/Container/Container';
import {
  ArrowRightIcon,
  BoltIcon,
  ChartIcon,
  ShieldIcon,
} from '../../../../components/common/Icon/Icon';
import { ROUTES } from '../../../../routes/paths';
import heroForeground from '../../../../assets/images/hero-foreground.png';
import cx from '../../../../utils/classNames';
import styles from './Hero.module.css';

const HIGHLIGHTS = [
  { icon: ShieldIcon, value: '100%', label: 'Secure' },
  { icon: BoltIcon, value: 'Instant', label: 'Transactions' },
  { icon: ChartIcon, value: 'Smart', label: 'Insights' },
];

function Hero() {
  return (
    <section className={styles.hero} id="top">
      {/* Decorative layers: the world-map/city plate, then the brand glow. */}
      <div className={styles.heroBackdrop} aria-hidden="true" />
      <div className={styles.heroGlow} aria-hidden="true" />

      <Container className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} aria-hidden="true" />
            Your Money. Smarter.
          </p>

          <h1 className={styles.heroTitle}>
            Banking that <span className={'u-gradient-text'}>thinks</span> ahead.
          </h1>

          <p className={styles.heroSubtitle}>
            Neuron Bank combines advanced technology with human understanding to
            give you a seamless and secure banking experience.
          </p>

          <div className={styles.heroActions}>
            <Button variant="primary" size="lg" to={ROUTES.register}>
              Open an Account
              <ArrowRightIcon />
            </Button>
            <Button variant="ghost" size="lg" href="#features">
              Explore Features
            </Button>
          </div>

          <ul className={cx(styles.heroHighlights, 'u-glass')}>
            {HIGHLIGHTS.map(({ icon: Icon, value, label }) => (
              <li key={label} className={styles.heroHighlight}>
                <span className={styles.heroHighlightIcon}>
                  <Icon />
                </span>
                <span className={styles.heroHighlightText}>
                  <strong>{value}</strong>
                  <small>{label}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.heroVisual}>
          <img
            src={heroForeground}
            alt="The Neuron Bank mobile app showing an account balance, quick actions and recent transactions, next to a Neuron Bank Visa debit card."
            className={styles.heroDevice}
            width={1200}
            height={800}
          />
        </div>
      </Container>
    </section>
  );
}

export default Hero;
