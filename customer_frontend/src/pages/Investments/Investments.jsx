import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowRight, Clock, PiggyBank, ShieldCheck, TrendingUp } from 'lucide-react';
import OpenDepositModal from './OpenDepositModal';
import CloseDepositModal from './CloseDepositModal';
import {
  loadDeposits,
  loadRates,
  selectDeposits,
  selectProductError,
  selectProductStatus,
  selectRates,
  selectTotals,
} from '../../store/investmentsSlice';
import { selectAnalyticsBalance } from '../../store/analyticsSlice';
import { formatCurrency } from '../../utils/format';
import heroArt from '../../assets/images/invest-hero.png';
import fdArt from '../../assets/images/invest-fd.png';
import rdArt from '../../assets/images/invest-rd.png';
import cx from '../../utils/classNames';
import styles from './Investments.module.css';

const PRODUCTS = {
  fd: {
    key: 'fd',
    tab: 'Fixed Deposit (FD)',
    title: 'Fixed Deposit (FD)',
    blurb: 'Invest a lump sum amount and earn guaranteed returns.',
    cta: 'Open Fixed Deposit',
    art: fdArt,
    perks: [
      { icon: TrendingUp, label: 'Attractive Interest Rates' },
      { icon: Clock, label: 'Flexible Tenure Options' },
      { icon: ShieldCheck, label: 'Safe & Secure' },
    ],
  },
  rd: {
    key: 'rd',
    tab: 'Recurring Deposit (RD)',
    title: 'Recurring Deposit (RD)',
    blurb: 'Invest a fixed amount regularly and build your savings discipline.',
    cta: 'Open Recurring Deposit',
    art: rdArt,
    perks: [
      { icon: PiggyBank, label: 'Start with Small Amounts' },
      { icon: Clock, label: 'Flexible Tenure Options' },
      { icon: ShieldCheck, label: 'Guaranteed Returns' },
    ],
  },
};

const STATUS_TONES = {
  active: styles.statusActive,
  matured: styles.statusMatured,
  closed: styles.statusClosed,
};

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Investments() {
  const dispatch = useDispatch();
  const [product, setProduct] = useState('fd');
  const [tab, setTab] = useState('active');
  const [openFor, setOpenFor] = useState(null);
  const [closing, setClosing] = useState(null);

  const config = PRODUCTS[product];
  const rates = useSelector(selectRates(product));
  const deposits = useSelector(selectDeposits(product));
  const totals = useSelector(selectTotals(product));
  const status = useSelector(selectProductStatus(product));
  const error = useSelector(selectProductError(product));
  const balance = useSelector(selectAnalyticsBalance);

  useEffect(() => {
    dispatch(loadRates(product));
    dispatch(loadDeposits(product));
  }, [dispatch, product]);

  // Matured and closed both belong in history, since neither is still running.
  const { active, history } = useMemo(() => {
    return {
      active: deposits.filter((item) => item.status === 'active'),
      history: deposits.filter((item) => item.status !== 'active'),
    };
  }, [deposits]);

  const rows = tab === 'active' ? active : history;
  const isFd = product === 'fd';

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Investments</h1>
          <p className={styles.subtitle}>
            Grow your wealth with secure and flexible investment options.
          </p>
        </div>

        <img src={heroArt} alt="" className={styles.heroArt} />
      </header>

      <div className={styles.tabs} role="tablist">
        {Object.values(PRODUCTS).map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={product === item.key}
            className={cx(styles.tab, product === item.key && styles.tabOn)}
            onClick={() => setProduct(item.key)}
          >
            {item.tab}
          </button>
        ))}
      </div>

      <section className={styles.product}>
        <div className={styles.productBody}>
          <header className={styles.productHead}>
            <h2 className={styles.productTitle}>{config.title}</h2>
            <span className={styles.riskTag}>Low Risk</span>
          </header>

          <p className={styles.productBlurb}>{config.blurb}</p>

          <ul className={styles.perks}>
            {config.perks.map(({ icon: Icon, label }) => (
              <li key={label} className={styles.perk}>
                <span className={styles.perkIcon} aria-hidden="true">
                  <Icon size={18} />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={styles.openButton}
            onClick={() => setOpenFor(product)}
          >
            {config.cta}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>

        <img src={config.art} alt="" className={styles.productArt} />
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <h2 className={styles.panelTitle}>
            {isFd ? 'FD' : 'RD'} Interest Rates (p.a.)
          </h2>
        </header>

        {rates?.slabs ? (
          <ul className={styles.slabs}>
            {rates.slabs.map((slab) => (
              <li key={slab.label} className={styles.slab}>
                <span className={styles.slabLabel}>{slab.label}</span>
                <strong className={styles.slabRate}>{slab.rate}%</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>Loading rates…</p>
        )}
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>Your Investments</h2>
            <p className={styles.panelSubtitle}>
              Track and manage your {isFd ? 'Fixed' : 'Recurring'} Deposits.
            </p>
          </div>

          {totals?.activeCount > 0 && (
            <dl className={styles.totals}>
              <div>
                <dt>{isFd ? 'Active principal' : 'Monthly commitment'}</dt>
                <dd>
                  {formatCurrency(
                    isFd ? totals.activePrincipal : totals.monthlyCommitment,
                  )}
                </dd>
              </div>
              <div>
                <dt>{isFd ? 'Expected maturity' : 'Deposited so far'}</dt>
                <dd>
                  {formatCurrency(
                    isFd ? totals.expectedMaturity : totals.totalDeposited,
                  )}
                </dd>
              </div>
            </dl>
          )}
        </header>

        <div className={styles.subTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'active'}
            className={cx(styles.subTab, tab === 'active' && styles.subTabOn)}
            onClick={() => setTab('active')}
          >
            Active ({active.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            className={cx(styles.subTab, tab === 'history' && styles.subTabOn)}
            onClick={() => setTab('history')}
          >
            Matured &amp; Closed ({history.length})
          </button>
        </div>

        {status === 'pending' && (
          <ul className={styles.skeletonList} aria-hidden="true">
            {Array.from({ length: 2 }, (unused, index) => (
              <li key={index} className={styles.skeletonRow} />
            ))}
          </ul>
        )}

        {status === 'failed' && (
          <p className={styles.error} role="alert">
            {error?.message || 'Could not load your investments.'}
          </p>
        )}

        {status === 'succeeded' && rows.length === 0 && (
          <div className={styles.emptyState}>
            <p>
              {tab === 'active'
                ? `No active ${isFd ? 'fixed' : 'recurring'} deposits.`
                : 'Nothing has matured or been closed yet.'}
            </p>
            {tab === 'active' && (
              <p className={styles.hint}>
                Open one above to start earning {rates?.slabs?.[0]?.rate ?? ''}% or more.
              </p>
            )}
          </div>
        )}

        <ul className={styles.list}>
          {rows.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>
                  {isFd ? 'Fixed Deposit' : 'Recurring Deposit'}
                </p>
                <p className={styles.rowNumber}>
                  {item.depositNumber} · {item.tenureLabel}
                </p>
              </div>

              <div className={styles.rowFigure}>
                <p className={styles.rowValue}>
                  {formatCurrency(isFd ? item.principal : item.installmentAmount)}
                </p>
                <p className={styles.rowLabel}>
                  {isFd ? 'Principal' : 'Monthly amount'}
                </p>
              </div>

              <div className={styles.rowFigure}>
                <p className={styles.rowValue}>{item.interestRate}%</p>
                <p className={styles.rowLabel}>Interest rate (p.a.)</p>
              </div>

              <div className={styles.rowFigure}>
                <p className={styles.rowValue}>{formatDate(item.maturityDate)}</p>
                <p className={styles.rowLabel}>Maturity date</p>
              </div>

              <span className={cx(styles.status, STATUS_TONES[item.status])}>
                {item.status}
              </span>

              {item.status !== 'closed' && (
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={() => setClosing(item)}
                >
                  {item.status === 'matured' ? 'Withdraw' : 'Close'}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <OpenDepositModal
        open={Boolean(openFor)}
        product={openFor || product}
        balance={balance}
        onClose={() => setOpenFor(null)}
      />

      <CloseDepositModal
        open={Boolean(closing)}
        product={product}
        deposit={closing}
        onClose={() => setClosing(null)}
      />
    </div>
  );
}

export default Investments;
