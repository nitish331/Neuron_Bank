import { useDispatch, useSelector } from 'react-redux';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  loadAnalytics,
  selectAnalyticsMonths,
  selectAnalyticsStatus,
  selectMonthlySeries,
} from '../../../store/analyticsSlice';
import { formatAxisTick, formatCurrency } from '../../../utils/format';
import styles from '../Dashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Violet + teal. The design's violet/blue pair is indistinguishable for
// red-green colour blindness, so the second series moves to a separable hue.
const SERIES = [
  { key: 'income', label: 'Income', color: '#8b5cf6' },
  { key: 'expenses', label: 'Expenses', color: '#0891b2' },
];

const RANGES = [
  { label: 'Last 6 months', months: 6 },
  { label: 'Last 12 months', months: 12 },
];

function CashflowChart({ theme }) {
  const dispatch = useDispatch();
  const series = useSelector(selectMonthlySeries);
  const months = useSelector(selectAnalyticsMonths);
  const status = useSelector(selectAnalyticsStatus);

  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,17,41,0.09)';
  const tickColor = isDark ? '#7c8199' : '#6b7089';

  const data = {
    labels: series.labels,
    datasets: SERIES.map(({ key, label, color }) => ({
      label,
      data: series[key],
      backgroundColor: color,
      borderRadius: 4,
      borderSkipped: 'bottom',
      barPercentage: 0.72,
      categoryPercentage: 0.66,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
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
        boxWidth: 9,
        boxHeight: 9,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0, autoSkip: true },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor, drawTicks: false },
        border: { display: false },
        ticks: { color: tickColor, font: { size: 11 }, padding: 8, callback: formatAxisTick },
      },
    },
  };

  const hasMovement = series.income.some(Boolean) || series.expenses.some(Boolean);
  const isEmpty = status === 'succeeded' && !hasMovement;

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Income vs Expenses</h2>

        <div className={styles.cardTools}>
          <ul className={styles.legend}>
            {SERIES.map(({ key, label, color }) => (
              <li key={key} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>

          <label className={styles.rangeSelect}>
            <span className="u-visually-hidden">Date range</span>
            {/* The range is a server query, so changing it refetches. */}
            <select
              value={months}
              disabled={status === 'pending'}
              onChange={(event) =>
                dispatch(loadAnalytics({ months: Number(event.target.value) }))
              }
            >
              {RANGES.map((range) => (
                <option key={range.months} value={range.months}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <p>Nothing to chart yet.</p>
          <p className={styles.emptyHint}>
            Your monthly income and spending will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.chartArea}>
          <Bar data={data} options={options} />
        </div>
      )}
    </section>
  );
}

export default CashflowChart;
