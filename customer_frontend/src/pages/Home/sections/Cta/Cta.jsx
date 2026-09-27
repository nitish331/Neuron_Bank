import Button from '../../../../components/common/Button/Button';
import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import { ArrowRightIcon, RocketIcon } from '../../../../components/common/Icon/Icon';
import { ROUTES } from '../../../../routes/paths';
import devices from '../../../../assets/images/cta-devices.png';
import badgeAppStore from '../../../../assets/images/badge-app-store.png';
import badgeGooglePlay from '../../../../assets/images/badge-google-play.png';
import iconQuick from '../../../../assets/images/cta-quick.png';
import iconPaperless from '../../../../assets/images/cta-paperless.png';
import iconInstant from '../../../../assets/images/cta-instant.png';
import iconInvest from '../../../../assets/images/cta-invest.png';
import iconSupport from '../../../../assets/images/cta-support.png';
// Same icon family, already in the library from the card section.
import iconRewards from '../../../../assets/images/cd-rewards.png';
import iconRefer from '../../../../assets/images/cd-cashback.png';
import iconPersonal from '../../../../assets/images/cd-security.png';
import styles from './Cta.module.css';

const STEPS = [
  {
    icon: iconQuick,
    title: 'Quick Account Opening',
    body: 'Open your account in less than 5 minutes.',
  },
  {
    icon: iconPaperless,
    title: 'Zero Paperwork',
    body: '100% digital process. No hidden charges.',
  },
  {
    icon: iconInstant,
    title: 'Start Banking Instantly',
    body: 'Fund your account and start using immediately.',
  },
];

const PERKS = [
  {
    icon: iconRewards,
    title: 'Welcome Rewards',
    body: 'Get exclusive rewards when you join.',
  },
  {
    icon: iconRefer,
    title: 'Refer & Earn',
    body: 'Refer your friends and earn exciting cashback.',
  },
  {
    icon: iconInvest,
    title: 'Smart Investments',
    body: 'Grow your money with curated investment options.',
  },
  {
    icon: iconPersonal,
    title: 'Personalized For You',
    body: 'Tailored insights and recommendations just for you.',
  },
  {
    icon: iconSupport,
    title: "We're Here 24/7",
    body: 'Our support team is always ready to help you anytime.',
  },
];

function Cta() {
  return (
    <section className={styles.cta}>
      <div className={styles.ctaGlow} aria-hidden="true" />

      <Container>
        <div className={styles.ctaTop}>
          <div className={styles.ctaCopy}>
            <SectionHeading
              align="start"
              eyebrow="Join Neuron Bank"
              eyebrowIcon={RocketIcon}
              subtitle="Open your account in minutes and experience the future of banking today."
            >
              <span>Ready to bank</span>
              <span className={'u-gradient-text'}>smarter?</span>
            </SectionHeading>

            <ul className={styles.ctaSteps}>
              {STEPS.map((step) => (
                <li key={step.title} className={styles.ctaStep}>
                  <img
                    src={step.icon}
                    alt=""
                    className={styles.ctaStepIcon}
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                  <div>
                    <h3 className={styles.ctaStepTitle}>{step.title}</h3>
                    <p className={styles.ctaStepBody}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Button variant="primary" size="lg" to={ROUTES.register}>
              Open Your Account Now
              <ArrowRightIcon />
            </Button>

            <div >
              <p className={styles.ctaStoresLabel}>Download the Neuron Bank App</p>
              <div className={styles.ctaStoresBadges}>
                {/* Placeholder marks — no app exists yet, so these do not link. */}
                <img src={badgeAppStore} alt="Download on the App Store" width={171} height={59} />
                <img src={badgeGooglePlay} alt="Get it on Google Play" width={183} height={59} />
              </div>
            </div>
          </div>

          <div className={styles.ctaDevices}>
            <img
              src={devices}
              alt="The Neuron Bank app on a phone beside a Neuron Bank Visa debit card."
              width={873}
              height={632}
              loading="lazy"
            />
          </div>
        </div>

        <ul className={styles.ctaPerks}>
          {PERKS.map((perk) => (
            <li key={perk.title} className={styles.ctaPerk}>
              <img
                src={perk.icon}
                alt=""
                className={styles.ctaPerkIcon}
                width={56}
                height={56}
                loading="lazy"
              />
              <div>
                <h3 className={styles.ctaPerkTitle}>{perk.title}</h3>
                <p className={styles.ctaPerkBody}>{perk.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default Cta;
