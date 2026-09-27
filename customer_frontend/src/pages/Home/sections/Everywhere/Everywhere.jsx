import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import { GlobeIcon } from '../../../../components/common/Icon/Icon';
import devices from '../../../../assets/images/everywhere-devices.png';
import iconMobileBanking from '../../../../assets/images/ev-mobile-banking.png';
import iconOnlineBanking from '../../../../assets/images/ev-online-banking.png';
import iconScanPay from '../../../../assets/images/ev-scan-pay.png';
import iconInstantPayments from '../../../../assets/images/ev-instant-payments.png';
import iconDebitCard from '../../../../assets/images/ev-debit-card.png';
import iconWearable from '../../../../assets/images/ev-wearable.png';
import iconGlobalAccess from '../../../../assets/images/ev-global-access.png';
import iconSecurity from '../../../../assets/images/ev-security.png';
import iconLightningFast from '../../../../assets/images/ev-lightning-fast.png';
import iconSupport from '../../../../assets/images/ev-support.png';
import iconSmartAlerts from '../../../../assets/images/ev-smart-alerts.png';
import iconAssistance from '../../../../assets/images/ev-assistance.png';
import styles from './Everywhere.module.css';

// Ordered to fill the two-column grid row by row, matching the design's pairing.
const CHANNELS = [
  {
    icon: iconMobileBanking,
    title: 'Mobile Banking',
    body: 'Full control in the palm of your hand.',
  },
  {
    icon: iconOnlineBanking,
    title: 'Online Banking',
    body: 'Secure, fast and intuitive web experience.',
  },
  {
    icon: iconScanPay,
    title: 'Scan & Pay',
    body: 'Pay instantly with QR anywhere.',
  },
  {
    icon: iconInstantPayments,
    title: 'Instant Payments',
    body: 'Send money instantly to anyone, anytime.',
  },
  {
    icon: iconDebitCard,
    title: 'Debit Card',
    body: 'Global access with secure and smart transactions.',
  },
  {
    icon: iconWearable,
    title: 'Wearable Support',
    body: 'Bank on your watch with ease.',
  },
];

const PERKS = [
  {
    icon: iconGlobalAccess,
    title: 'Global Access',
    body: 'Use your account anywhere in the world without limits.',
  },
  {
    icon: iconSecurity,
    title: 'Top-notch Security',
    body: 'Bank with advanced security and real-time fraud protection.',
  },
  {
    icon: iconLightningFast,
    title: 'Lightning Fast',
    body: 'Experience ultra-fast banking with zero unnecessary delays.',
  },
  {
    icon: iconSupport,
    title: '24/7 Support',
    body: "We're here for you, round the clock, every single day.",
  },
  {
    icon: iconSmartAlerts,
    title: 'Smart Alerts',
    body: 'Get real-time updates and never miss what matters.',
  },
  {
    icon: iconAssistance,
    title: 'Personal Assistance',
    body: 'Dedicated support to help you with all your banking needs.',
  },
];

function Everywhere() {
  return (
    <section className={styles.everywhere}>
      <div className={styles.everywhereGlow} aria-hidden="true" />

      <Container>
        <div className={styles.everywhereTop}>
          <div className={styles.everywhereCopy}>
            <SectionHeading
              align="start"
              eyebrow="Banking Everywhere"
              eyebrowIcon={GlobeIcon}
              subtitle="Seamless banking across all your devices. Manage your money anytime, anywhere."
            >
              <span>Your bank goes</span>
              <span>
                where <span className={'u-gradient-text'}>you go.</span>
              </span>
            </SectionHeading>

            <ul className={styles.everywhereChannels}>
              {CHANNELS.map((channel) => (
                <li key={channel.title} className={styles.channel}>
                  <img
                    src={channel.icon}
                    alt=""
                    className={styles.channelIcon}
                    width={56}
                    height={56}
                    loading="lazy"
                  />
                  <div>
                    <h3 className={styles.channelTitle}>{channel.title}</h3>
                    <p className={styles.channelBody}>{channel.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.everywhereDevices}>
            <img
              src={devices}
              alt="The Neuron Bank app on a phone, the dashboard on a laptop, and a Neuron Bank Visa debit card."
              width={941}
              height={706}
              loading="lazy"
            />
          </div>
        </div>

        <ul className={styles.everywherePerks}>
          {PERKS.map((perk) => (
            <li key={perk.title} className={styles.perk}>
              <img
                src={perk.icon}
                alt=""
                className={styles.perkIcon}
                width={84}
                height={78}
                loading="lazy"
              />
              <h3 className={styles.perkTitle}>{perk.title}</h3>
              <p className={styles.perkBody}>{perk.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default Everywhere;
