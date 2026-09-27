import Button from '../../../../components/common/Button/Button';
import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import { ArrowRightIcon, CardIcon } from '../../../../components/common/Icon/Icon';
import { ROUTES } from '../../../../routes/paths';
import cardArt from '../../../../assets/images/card-art.png';
import iconContactless from '../../../../assets/images/cd-contactless.png';
import iconGlobal from '../../../../assets/images/cd-global.png';
import iconControls from '../../../../assets/images/cd-controls.png';
import iconRewards from '../../../../assets/images/cd-rewards.png';
import iconFreeze from '../../../../assets/images/cd-freeze.png';
import iconSecurity from '../../../../assets/images/cd-security.png';
import iconChipSecure from '../../../../assets/images/cd-chip-secure.png';
import iconChipManage from '../../../../assets/images/cd-chip-manage.png';
import iconChipAlerts from '../../../../assets/images/cd-chip-alerts.png';
import iconChipLimits from '../../../../assets/images/cd-chip-limits.png';
import iconZeroLiability from '../../../../assets/images/cd-zero-liability.png';
import iconFastDelivery from '../../../../assets/images/cd-fast-delivery.png';
import iconCashback from '../../../../assets/images/cd-cashback.png';
import iconFuel from '../../../../assets/images/cd-fuel.png';
import iconTravel from '../../../../assets/images/cd-travel.png';
import iconOffers from '../../../../assets/images/cd-offers.png';
import iconLifetime from '../../../../assets/images/cd-lifetime.png';
import iconStar from '../../../../assets/images/cd-star.png';
import styles from './Card.module.css';

// Ordered to fill the two-column grid row by row, as the design pairs them.
const FEATURES = [
  {
    icon: iconContactless,
    title: 'Contactless Payments',
    body: 'Tap and pay anywhere with speed and security.',
  },
  {
    icon: iconGlobal,
    title: 'Global Acceptance',
    body: 'Use your card in 190+ countries worldwide.',
  },
  {
    icon: iconControls,
    title: 'Real-time Controls',
    body: 'Manage limits, freeze/unfreeze and more in real-time.',
  },
  {
    icon: iconRewards,
    title: 'Smart Rewards',
    body: 'Earn cashback, rewards and exclusive offers.',
  },
  {
    icon: iconFreeze,
    title: 'Instant Freeze',
    body: 'Freeze your card instantly with one tap.',
  },
  {
    icon: iconSecurity,
    title: 'Enhanced Security',
    body: 'Advanced chip technology and fraud protection.',
  },
];

// `zone` picks the grid area the callout lives in: a row above the card, or a
// stack down its right-hand side. Grid cells rather than absolute offsets, so a
// long label can never end up sitting on top of the artwork.
const CALLOUTS = [
  {
    icon: iconChipSecure,
    title: '100% Secure',
    body: 'Your card. Your control.',
    zone: 'top',
  },
  {
    icon: iconChipManage,
    title: 'Manage on the go',
    body: 'Full visibility and control from the Neuron App.',
    zone: 'top',
  },
  {
    icon: iconChipAlerts,
    title: 'Instant Alerts',
    body: 'Get notified for every transaction instantly.',
    zone: 'side',
  },
  {
    icon: iconChipLimits,
    title: 'Higher Limits',
    body: 'Enjoy higher spending limits as you grow.',
    zone: 'side',
  },
];

const ASSURANCES = [
  {
    icon: iconZeroLiability,
    title: 'Zero Liability Protection',
    body: "You're 100% protected against unauthorized transactions.",
  },
  {
    icon: iconFastDelivery,
    title: 'Card Delivered Fast',
    body: 'Get your Neuron Card delivered to your doorstep.',
  },
];

const BENEFITS = [
  {
    icon: iconCashback,
    title: 'Up to 5% Cashback',
    body: 'On your favorite categories.',
  },
  {
    icon: iconFuel,
    title: 'Fuel Surcharge Waiver',
    body: '1% waiver across all fuel stations.',
  },
  {
    icon: iconTravel,
    title: 'Travel Privileges',
    body: 'Airport lounge access and more.',
  },
  {
    icon: iconOffers,
    title: 'Exclusive Offers',
    body: 'Special discounts on top brands.',
  },
  {
    icon: iconLifetime,
    title: 'Lifetime Free',
    body: 'No joining or annual renewal charges.',
  },
];

function Callout({ icon, title, body }) {
  return (
    <div className={styles.cardCallout}>
      <img
        src={icon}
        alt=""
        className={styles.cardCalloutIcon}
        width={34}
        height={34}
        loading="lazy"
      />
      <div>
        <h3 className={styles.cardCalloutTitle}>{title}</h3>
        <p className={styles.cardCalloutBody}>{body}</p>
      </div>
    </div>
  );
}

function Card() {
  return (
    <section className={styles.cardSection} id="cards">
      <div className={styles.cardSectionGlow} aria-hidden="true" />

      <Container>
        <div className={styles.cardSectionTop}>
          <div className={styles.cardSectionCopy}>
            <SectionHeading
              align="start"
              eyebrow="Neuron Card"
              eyebrowIcon={CardIcon}
              subtitle="Designed to give you more control, better rewards, and a seamless banking experience."
            >
              <span>The card built for</span>
              <span className={'u-gradient-text'}>smarter spending.</span>
            </SectionHeading>

            <ul className={styles.cardSectionFeatures}>
              {FEATURES.map((feature) => (
                <li key={feature.title} className={styles.cardFeature}>
                  <img
                    src={feature.icon}
                    alt=""
                    className={styles.cardFeatureIcon}
                    width={60}
                    height={60}
                    loading="lazy"
                  />
                  <div>
                    <h3 className={styles.cardFeatureTitle}>{feature.title}</h3>
                    <p className={styles.cardFeatureBody}>{feature.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Button variant="primary" size="lg" to={ROUTES.register}>
              Get Your Neuron Card
              <ArrowRightIcon />
            </Button>
          </div>

          <div className={styles.cardSectionShowcase}>
            <div className={styles.cardStage}>
              <div className={styles.cardStageTop}>
                {CALLOUTS.filter((c) => c.zone === 'top').map((callout) => (
                  <Callout key={callout.title} {...callout} />
                ))}
              </div>

              <p className={styles.cardRating}>
                <span className={styles.cardRatingScore}>
                  <img src={iconStar} alt="" width={18} height={18} />
                  4.8/5
                </span>
                <span className={styles.cardRatingLabel}>
                  Rated by thousands of users
                </span>
              </p>

              <img
                src={cardArt}
                alt="The Neuron Bank Visa Debit card, showing the chip, contactless symbol and neural circuit artwork."
                className={styles.cardStageArt}
                width={1100}
                height={738}
                loading="lazy"
              />

              <div className={styles.cardStageSide}>
                {CALLOUTS.filter((c) => c.zone === 'side').map((callout) => (
                  <Callout key={callout.title} {...callout} />
                ))}
              </div>
            </div>

            <ul className={styles.cardSectionAssurances}>
              {ASSURANCES.map((item) => (
                <li key={item.title} className={styles.assurance}>
                  <img
                    src={item.icon}
                    alt=""
                    className={styles.assuranceIcon}
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                  <div>
                    <h3 className={styles.assuranceTitle}>{item.title}</h3>
                    <p className={styles.assuranceBody}>{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.cardSectionBenefits}>
          <h3 className={styles.cardSectionBenefitsTitle}>
            <span className={'u-gradient-text'}>More benefits.</span>
            <span className={'u-gradient-text'}>More for you.</span>
          </h3>

          <ul className={styles.cardSectionBenefitsList}>
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className={styles.benefit}>
                <img
                  src={benefit.icon}
                  alt=""
                  className={styles.benefitIcon}
                  width={56}
                  height={56}
                  loading="lazy"
                />
                <h4 className={styles.benefitTitle}>{benefit.title}</h4>
                <p className={styles.benefitBody}>{benefit.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export default Card;
