import { useSelector } from 'react-redux';
import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  selectAnalyticsBalance,
  selectCashflow,
  selectInvestments,
  selectLoans,
  selectPlaceholders,
} from '../../../store/analyticsSlice';
import { formatCurrency } from '../../../utils/format';
import styles from '../Dashboard.module.css';

ChartJS.register(ArcElement, Tooltip);

// Fixed order, never cycled. Validated against both the light and dark surface.
const SERIES_COLORS = ['#8b5cf6', '#d97706', '#0891b2', '#db2777'];

function SpendingChart({ theme }) {
  const balance = useSelector(selectAnalyticsBalance);
  const { moneyOut } = useSelector(selectCashflow);
  const investments = useSelector(selectInvestments);
  const loans = useSelector(selectLoans);
  const placeholders = useSelector(selectPlaceholders);

  const isDark = theme === 'dark';
  const surface = isDark ? '#0f1129' : '#ffffff';

  // `real` is driven by the server's own list of unbacked figures.
  const slices = [
    { label: 'Balance', value: balance ?? 0, real: true },
    {
      label: 'Investments',
      value: investments?.total ?? 0,
      real: !placeholders.includes('investments'),
    },
    { label: 'Spendings', value: moneyOut, real: true },
    {
      label: 'Loans',
      value: loans?.total ?? 0,
      real: !placeholders.includes('loans'),
    },
  ];

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const data = {
    labels: slices.map((slice) => slice.label),
    datasets: [
      {
        data: slices.map((slice) => slice.value),
        backgroundColor: SERIES_COLORS,
        // A surface-coloured ring separates neighbouring arcs.
        borderColor: surface,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#151833' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#0f1129',
        bodyColor: isDark ? '#b8bcd6' : '#4a4f6a',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,17,41,0.12)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const share = total ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${formatCurrency(ctx.parsed)} · ${share}%`;
          },
        },
      },
    },
  };

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Account Overview</h2>
      </header>

      <div className={styles.donutRow}>
        <div className={styles.donutWrap}>
          <Doughnut data={data} options={options} />
          <div className={styles.donutCentre}>
            <strong>{formatCurrency(total)}</strong>
            <span>Total</span>
          </div>
        </div>

        <ul className={styles.donutLegend}>
          {slices.map((slice, index) => (
            <li key={slice.label} className={styles.donutLegendItem}>
              <span
                className={styles.legendSwatch}
                style={{ background: SERIES_COLORS[index] }}
                aria-hidden="true"
              />
              <span className={styles.donutLegendLabel}>
                {slice.label}
                {/* Marks the figures that are not wired to an endpoint yet. */}
                {!slice.real && <span className={styles.estimated}>est.</span>}
              </span>
              <span className={styles.donutLegendValue}>
                {formatCurrency(slice.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default SpendingChart;
