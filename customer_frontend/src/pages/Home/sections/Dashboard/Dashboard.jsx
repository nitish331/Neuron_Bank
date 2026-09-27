import Container from '../../../../components/common/Container/Container';
import SectionHeading from '../../../../components/common/SectionHeading/SectionHeading';
import dashboardPreview from '../../../../assets/images/dashboard-preview.png';
import styles from './Dashboard.module.css';

function Dashboard() {
  return (
    <section className={styles.dashboard} id="dashboard">
      <div className={styles.dashboardGlow} aria-hidden="true" />

      <Container>
        <SectionHeading
          eyebrow="Your money. Your control."
          subtitle="Get a clear, real-time overview of your money, track what matters, and make smarter financial decisions."
          className={styles.dashboardHeader}
        >
          <span>All your finances.</span>
          <span>
            In one <span className={'u-gradient-text'}>intelligent</span>{' '}
            dashboard.
          </span>
        </SectionHeading>

        <div className={styles.dashboardPreview}>
          <img
            src={dashboardPreview}
            alt="The Neuron Bank dashboard: total balance, income and expenses, a balance trend chart, a spending breakdown by category, and cards for accounts, upcoming bills, investments and savings goals."
            width={1491}
            height={913}
            loading="lazy"
          />
        </div>
      </Container>
    </section>
  );
}

export default Dashboard;
