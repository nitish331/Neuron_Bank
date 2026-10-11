import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Lock, Percent, RotateCcw } from 'lucide-react';
import {
  loadRates,
  saveRates,
  saveReset,
  selectLastSaved,
  selectRateCards,
  selectRatesError,
  selectRatesStatus,
  selectSaveError,
  selectSaveStatus,
} from '../../store/ratesSlice';
import cx from '../../utils/classNames';
import styles from './InterestRates.module.css';

const TABS = [
  { value: 'fixedDeposit', label: 'Fixed Deposit' },
  { value: 'recurringDeposit', label: 'Recurring Deposit' },
  { value: 'loan', label: 'Loans' },
];

/** Mirrors the server: 0–100, at most two decimals. */
function validateRate(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return 'Required';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return 'Max 2 decimals';

  const rate = Number(trimmed);
  if (rate < 0 || rate > 100) return 'Must be 0–100';
  return '';
}

function InterestRates() {
  const dispatch = useDispatch();
  const rateCards = useSelector(selectRateCards);
  const status = useSelector(selectRatesStatus);
  const error = useSelector(selectRatesError);
  const saveStatus = useSelector(selectSaveStatus);
  const saveError = useSelector(selectSaveError);
  const lastSaved = useSelector(selectLastSaved);

  const [type, setType] = useState('fixedDeposit');
  // Keyed by slab label, which is what the server matches on.
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    dispatch(loadRates());
  }, [dispatch]);

  const card = rateCards?.[type] ?? null;

  // Reset the draft whenever the tab changes or the card is re-read.
  useEffect(() => {
    if (!card) return;

    setDrafts(
      card.slabs.reduce((acc, slab) => ({ ...acc, [slab.label]: String(slab.rate) }), {}),
    );
    dispatch(saveReset());
  }, [card, dispatch]);

  const { changed, hasError } = useMemo(() => {
    if (!card) return { changed: [], hasError: false };

    const rows = card.slabs
      .map((slab) => ({ slab, draft: drafts[slab.label] ?? String(slab.rate) }))
      .filter(({ slab, draft }) => Number(draft) !== slab.rate);

    return {
      changed: rows.map(({ slab, draft }) => ({ label: slab.label, rate: Number(draft) })),
      hasError: Object.values(drafts).some((value) => validateRate(value)),
    };
  }, [card, drafts]);

  const isSaving = saveStatus === 'pending';
  const canSave = changed.length > 0 && !hasError && !isSaving;

  const reset = () => {
    if (!card) return;
    setDrafts(
      card.slabs.reduce((acc, slab) => ({ ...acc, [slab.label]: String(slab.rate) }), {}),
    );
    dispatch(saveReset());
  };

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    dispatch(saveRates({ type, rates: changed }));
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>
            Interest <span className="u-gradient-text">Rates</span>
          </h1>
          <p className={styles.subtitle}>
            Published rates for deposits and loans. New rates apply to products
            opened from now on.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={type === tab.value}
            className={cx(styles.tab, type === tab.value && styles.tabOn)}
            onClick={() => setType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === 'pending' && !rateCards && (
        <ul className={styles.skeletonList} aria-hidden="true">
          {Array.from({ length: 5 }, (unused, index) => (
            <li key={index} className={styles.skeletonRow} />
          ))}
        </ul>
      )}

      {status === 'failed' && (
        <p className={styles.error} role="alert">
          {error?.message || 'Could not load the rate cards.'}
        </p>
      )}

      {status === 'succeeded' && !card && (
        <p className={styles.error} role="alert">
          No rate card is configured for this product yet.
        </p>
      )}

      {card && (
        <form className={styles.panel} onSubmit={submit}>
          <p className={styles.lockNote}>
            <Lock size={16} aria-hidden="true" />
            Tenure bands are fixed. Only the rate can be changed here.
          </p>

          {lastSaved && saveStatus === 'succeeded' && (
            <p className={styles.success} role="status">
              <CheckCircle2 size={16} aria-hidden="true" />
              {lastSaved.message}
            </p>
          )}

          {saveError && (
            <p className={styles.error} role="alert">
              {saveError.message}
            </p>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tenure</th>
                  <th scope="col">Months</th>
                  <th scope="col">Published</th>
                  <th scope="col">New rate (% p.a.)</th>
                </tr>
              </thead>
              <tbody>
                {card.slabs.map((slab) => {
                  const draft = drafts[slab.label] ?? String(slab.rate);
                  const rowError = validateRate(draft);
                  const isChanged = !rowError && Number(draft) !== slab.rate;

                  return (
                    <tr key={slab.label} className={cx(isChanged && styles.rowChanged)}>
                      <td className={styles.cellLabel}>{slab.label}</td>

                      {/* Read-only: the band is the product, not a setting. */}
                      <td className={styles.cellRange}>
                        {slab.minMonths}–{slab.maxMonths}
                      </td>

                      <td className={styles.cellCurrent}>{slab.rate}%</td>

                      <td>
                        <div className={styles.rateControl}>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Rate for ${slab.label}`}
                            aria-invalid={rowError ? true : undefined}
                            className={cx(rowError && styles.inputInvalid)}
                            value={draft}
                            onChange={(event) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [slab.label]: event.target.value
                                  .replace(/[^\d.]/g, '')
                                  .slice(0, 6),
                              }))
                            }
                          />
                          <Percent size={15} aria-hidden="true" />
                        </div>
                        {rowError && <p className={styles.rowError}>{rowError}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className={styles.actions}>
            <p className={styles.changeCount}>
              {changed.length === 0
                ? 'No changes yet'
                : `${changed.length} rate${changed.length === 1 ? '' : 's'} changed`}
            </p>

            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={reset}
                disabled={changed.length === 0 || isSaving}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reset
              </button>
              {/* Gated until something actually differs and every row is valid. */}
              <button type="submit" className={styles.saveButton} disabled={!canSave}>
                {isSaving ? 'Saving…' : 'Publish rates'}
              </button>
            </div>
          </footer>
        </form>
      )}
    </div>
  );
}

export default InterestRates;
