import { Link } from 'react-router-dom';
import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import { ArrowRightIcon } from '../../../../components/common/Icon/Icon';
import { ROUTES } from '../../../../routes/paths';
import iconSmartAccounts from '../../../../assets/images/icon-smart-accounts.png';
import iconInstantTransfers from '../../../../assets/images/icon-instant-transfers.png';
import iconSpendAnalytics from '../../../../assets/images/icon-spend-analytics.png';
import iconBankSecurely from '../../../../assets/images/icon-bank-securely.png';
import iconLoansCredit from '../../../../assets/images/icon-loans-credit.png';
import appShowcase from '../../../../assets/images/feature-app-showcase.png';
import styles from './Features.module.css';

const FEATURES = [
  {
    icon: iconSmartAccounts,
    title: 'Smart Accounts',
    body: 'Open and manage multiple accounts with ease.',
    to: ROUTES.accounts,
  },
  {
    icon: iconInstantTransfers,
    title: 'Instant Transfers',
    body: 'Send or receive money instantly, 24/7, anywhere.',
    to: ROUTES.accounts,
  },
  {
    icon: iconSpendAnalytics,
    title: 'Spend Analytics',
    body: 'Track your spending patterns and get smarter insights.',
    to: ROUTES.investments,
  },
  {
    icon: iconBankSecurely,
    title: 'Bank Securely',
    body: 'Advanced security to keep your money and data protected.',
    to: ROUTES.support,
  },
  {
    icon: iconLoansCredit,
    title: 'Loans & Credit',
    body: 'Personalized loans and credit options that suit you.',
    to: ROUTES.loans,
  },
];

/** Target of the hero's "Explore Features" link — hence the id. */
function Features() {
  return (
    <section className={styles.features} id="features">
      <Container className={styles.featuresInner}>
        <div className={styles.featuresMain}>
          <SectionHeading
            eyebrow="Powerful. Secure. Seamless."
            subtitle="Neuron Bank combines cutting-edge technology with user-friendly tools to help you manage, grow, and protect your money."
            className={styles.featuresHeader}
          >
            <span>Everything you need.</span>
            <span>
              One <span className={'u-gradient-text'}>smart banking</span>{' '}
              experience.
            </span>
          </SectionHeading>

          <ul className={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <li key={feature.title} className={styles.featureCard}>
                <img
                  src={feature.icon}
                  alt=""
                  className={styles.featureCardIcon}
                  width={64}
                  height={63}
                  loading="lazy"
                />
                <h3 className={styles.featureCardTitle}>{feature.title}</h3>
                <p className={styles.featureCardBody}>{feature.body}</p>
                <Link to={feature.to} className={styles.featureCardLink}>
                  Learn more
                  <ArrowRightIcon />
                  <span className={'u-visually-hidden'}>
                    about {feature.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.featuresShowcase}>
          <img
            src={appShowcase}
            alt="The Neuron Bank app showing a monthly spending chart and recent transactions, beside a Neuron Bank Visa debit card."
            width={540}
            height={677}
            loading="lazy"
          />
        </div>
      </Container>
    </section>
  );
}

export default Features;
