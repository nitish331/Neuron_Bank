import Container from '../../../../components/common/Container/Container';
import securityShield from '../../../../assets/images/security-shield.png';
import statCustomers from '../../../../assets/images/stat-customers.png';
import statUptime from '../../../../assets/images/stat-uptime.png';
import statEncryption from '../../../../assets/images/stat-encryption.png';
import statRating from '../../../../assets/images/stat-rating.png';
import cx from '../../../../utils/classNames';
import styles from './Security.module.css';

const STATS = [
  {
    icon: statCustomers,
    value: '850K+',
    label: 'Happy Customers',
    note: 'Trust Neuron Bank',
  },
  {
    icon: statUptime,
    value: '99.99%',
    label: 'Uptime',
    note: 'Always here for you',
  },
  {
    icon: statEncryption,
    value: '256-bit',
    label: 'SSL Encryption',
    note: 'Bank-grade security',
  },
  {
    icon: statRating,
    value: '4.8/5',
    label: 'Customer Rating',
    note: 'On all platforms',
  },
];

function Security() {
  return (
    <section className={styles.security}>
      <Container>
        <div className={styles.securityPanel}>
          <div className={styles.securityIntro}>
            <img
              src={securityShield}
              alt=""
              className={styles.securityShield}
              width={141}
              height={161}
              loading="lazy"
            />
            <div>
              <h2 className={styles.securityTitle}>Your security is our priority</h2>
              <p className={styles.securityText}>
                Bank with confidence. Your data and money are always protected
                with top-tier security standards.
              </p>
            </div>
          </div>

          <dl className={styles.securityStats}>
            {STATS.map((stat) => (
              <div key={stat.label} className={styles.securityStat}>
                <img
                  src={stat.icon}
                  alt=""
                  className={styles.securityStatIcon}
                  width={56}
                  height={56}
                  loading="lazy"
                />
                <dt className={cx(styles.securityStatValue, 'u-gradient-text')}>
                  {stat.value}
                </dt>
                <dd className={styles.securityStatLabel}>
                  {stat.label}
                  <span>{stat.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

export default Security;
