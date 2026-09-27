import { useSelector } from 'react-redux';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Briefcase,
  ChartNoAxesColumn,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  selectCashflow,
  selectInvestments,
  selectLoans,
  selectPlaceholders,
} from '../../../store/analyticsSlice';
import { formatCurrency } from '../../../utils/format';
import cx from '../../../utils/classNames';
import styles from '../Dashboard.module.css';

const TONES = {
  positive: styles.tilePositive,
  negative: styles.tileNegative,
  neutral: styles.tileNeutral,
};

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function SummaryTiles() {
  const { moneyIn, moneyOut, inDelta, outDelta } = useSelector(selectCashflow);
  const loans = useSelector(selectLoans);
  const investments = useSelector(selectInvestments);
  const placeholders = useSelector(selectPlaceholders);

  const tiles = [
    {
      id: 'in',
      label: 'Money In',
      amount: moneyIn,
      delta: inDelta,
      // More money in is good news; more money out is not.
      deltaIsGood: inDelta !== null && inDelta >= 0,
      period: 'This Month',
      tone: 'positive',
      icon: ArrowDownToLine,
    },
    {
      id: 'out',
      label: 'Money Out',
      amount: moneyOut,
      delta: outDelta,
      deltaIsGood: outDelta !== null && outDelta < 0,
      period: 'This Month',
      tone: 'negative',
      icon: ArrowUpFromLine,
    },
    {
      id: 'investments',
      label: 'Investments',
      amount: investments?.total ?? 0,
      period: 'Portfolio value',
      tone: 'neutral',
      icon: ChartNoAxesColumn,
      // The server names the figures it cannot back yet.
      isPlaceholder: placeholders.includes('investments'),
    },
    {
      id: 'loans',
      label: 'Active Loans',
      amount: loans?.total ?? 0,
      period: loans?.pendingCount
        ? `${plural(loans.activeCount, 'active loan')}, ${loans.pendingCount} pending`
        : plural(loans?.activeCount ?? 0, 'active loan'),
      tone: 'neutral',
      icon: Briefcase,
      isPlaceholder: placeholders.includes('loans'),
    },
  ];

  return (
    <section className={styles.tiles}>
      {tiles.map((tile) => {
        const { id, label, amount, delta, deltaIsGood, period, tone } = tile;
        const Icon = tile.icon;
        const DeltaIcon = delta !== null && delta < 0 ? TrendingDown : TrendingUp;

        return (
          <article key={id} className={styles.tile}>
            <span className={cx(styles.tileIcon, TONES[tone])} aria-hidden="true">
              <Icon size={20} />
            </span>

            <div className={styles.tileBody}>
              <p className={styles.tileLabel}>
                {label}
                {tile.isPlaceholder && <span className={styles.estimated}>est.</span>}
              </p>
              <p className={styles.tileAmount}>{formatCurrency(amount)}</p>

              <p className={styles.tileMeta}>
                {/* Hidden when there is no previous month to compare against. */}
                {delta !== null && delta !== undefined && (
                  <span
                    className={cx(
                      styles.tileDelta,
                      deltaIsGood ? styles.deltaGood : styles.deltaBad,
                    )}
                  >
                    <DeltaIcon size={13} aria-hidden="true" />
                    {Math.abs(delta)}%
                  </span>
                )}
                {period}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export default SummaryTiles;
