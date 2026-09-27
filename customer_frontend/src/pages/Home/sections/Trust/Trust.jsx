import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import { LockIcon } from '../../../../components/common/Icon/Icon';
import shieldHero from '../../../../assets/images/sec-shield-hero.png';
import trustBadge from '../../../../assets/images/sec-trust-badge.png';
import iconEncryption from '../../../../assets/images/sec-encryption.png';
import iconMfa from '../../../../assets/images/sec-mfa.png';
import iconMonitoring from '../../../../assets/images/sec-monitoring.png';
import iconFraud from '../../../../assets/images/sec-fraud.png';
import iconCloud from '../../../../assets/images/sec-cloud.png';
import iconAlerts from '../../../../assets/images/sec-alerts.png';
// The group / lock / shield glyphs already exist from the Security band.
import statPeople from '../../../../assets/images/stat-customers.png';
import statLock from '../../../../assets/images/stat-encryption.png';
import statShield from '../../../../assets/images/stat-uptime.png';
import statPerson from '../../../../assets/images/sec-stat-person.png';
import logoPci from '../../../../assets/images/sec-logo-pci.png';
import logoIso from '../../../../assets/images/sec-logo-iso.png';
import logoGdpr from '../../../../assets/images/sec-logo-gdpr.png';
import logoRbi from '../../../../assets/images/sec-logo-rbi.png';
import cx from '../../../../utils/classNames';
import styles from './Trust.module.css';

const LEFT_MEASURES = [
  {
    icon: iconEncryption,
    title: '256-bit Encryption',
    body: 'Military-grade encryption keeps your data safe at all times.',
  },
  {
    icon: iconMfa,
    title: 'Multi-factor Authentication',
    body: 'Add an extra layer of security with OTP, biometrics & more.',
  },
  {
    icon: iconMonitoring,
    title: 'Real-time Monitoring',
    body: 'Advanced systems monitor your account 24/7 for suspicious activities.',
  },
];

const RIGHT_MEASURES = [
  {
    icon: iconFraud,
    title: 'Fraud Protection',
    body: 'AI-powered fraud detection prevents unauthorized transactions.',
  },
  {
    icon: iconCloud,
    title: 'Secure Cloud Infrastructure',
    body: 'Your data is stored in secure data centers with 99.99% uptime.',
  },
  {
    icon: iconAlerts,
    title: 'Instant Alerts',
    body: 'Get real-time alerts for every transaction and important activity.',
  },
];

const PROOF = [
  { icon: statPeople, value: '99.99%', label: 'Uptime' },
  { icon: statLock, value: '0', label: 'Security Breaches' },
  { icon: statShield, value: '100%', label: 'Secure Transactions' },
  { icon: statPerson, value: '2M+', label: 'Happy Customers' },
];

const CERTIFICATIONS = [
  { logo: logoPci, name: 'PCI DSS Compliant' },
  { logo: logoIso, name: 'ISO 27001 certified' },
  { logo: logoGdpr, name: 'GDPR Compliant' },
  { logo: logoRbi, name: 'RBI Compliant' },
];

/** One measure card — same markup either side of the shield. */
function MeasureCard({ icon, title, body }) {
  return (
    <li className={styles.measure}>
      <img
        src={icon}
        alt=""
        className={styles.measureIcon}
        width={60}
        height={60}
        loading="lazy"
      />
      <div>
        <h3 className={styles.measureTitle}>{title}</h3>
        <p className={styles.measureBody}>{body}</p>
      </div>
    </li>
  );
}

function Trust() {
  return (
    <section className={styles.trust}>
      <div className={styles.trustGlow} aria-hidden="true" />

      <Container>
        <SectionHeading
          eyebrow="Your security. Our priority."
          eyebrowIcon={LockIcon}
          subtitle="We use industry-leading security measures to keep your money and data always protected."
          className={styles.trustHeading}
        >
          <span>Bank with complete</span>
          <span>
            <span className={'u-gradient-text'}>confidence</span> and{' '}
            <span className={styles.trustTitleAccent}>security.</span>
          </span>
        </SectionHeading>

        {/* Measures flank the shield on desktop; the shield drops out of the
            flow and sits between them once the layout stacks. */}
        <div className={styles.trustMeasures}>
          <ul className={styles.trustColumn}>
            {LEFT_MEASURES.map((item) => (
              <MeasureCard key={item.title} {...item} />
            ))}
          </ul>

          <div className={styles.trustShield}>
            <img
              src={shieldHero}
              alt=""
              width={880}
              height={770}
              loading="lazy"
            />
          </div>

          <ul className={styles.trustColumn}>
            {RIGHT_MEASURES.map((item) => (
              <MeasureCard key={item.title} {...item} />
            ))}
          </ul>
        </div>

        {/* ---------- Proof band ---------- */}
        <div className={styles.trustProof}>
          <div className={styles.trustPromise}>
            <img
              src={trustBadge}
              alt=""
              className={styles.trustPromiseBadge}
              width={320}
              height={315}
              loading="lazy"
            />
            <div>
              <h3 className={styles.trustPromiseTitle}>
                <span>Your trust.</span>
                <span>Our responsibility.</span>
              </h3>
              <p className={styles.trustPromiseText}>
                We are committed to maintaining the highest standards of
                security and privacy.
              </p>
            </div>
          </div>

          <dl className={styles.trustStats}>
            {PROOF.map((stat) => (
              <div key={stat.label} className={styles.trustStat}>
                <img
                  src={stat.icon}
                  alt=""
                  className={styles.trustStatIcon}
                  width={48}
                  height={48}
                  loading="lazy"
                />
                <dt className={cx(styles.trustStatValue, 'u-gradient-text')}>
                  {stat.value}
                </dt>
                <dd className={styles.trustStatLabel}>{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ---------- Certifications ---------- */}
        <div className={styles.trustCerts}>
          <p className={styles.trustCertsText}>
            Trusted by thousands. Secured by the best.
          </p>
          <ul className={styles.trustCertsList}>
            {CERTIFICATIONS.map((cert) => (
              <li key={cert.name}>
                <img src={cert.logo} alt={cert.name} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export default Trust;
