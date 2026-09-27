import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays } from 'lucide-react';
import {
  draftChanged,
  draftCleared,
  EMPTY_FILTERS,
  loadPage,
  selectApplied,
  selectDraft,
  selectStatus,
} from '../../../store/transactionsSlice';
import styles from '../Transactions.module.css';

const TYPES = [
  { value: '', label: 'All Transactions' },
  { value: 'credit', label: 'Money In' },
  { value: 'debit', label: 'Money Out' },
];

function sameFilters(a, b) {
  return (
    a.type === b.type && a.startDate === b.startDate && a.endDate === b.endDate
  );
}

function TransactionFilters() {
  const dispatch = useDispatch();
  const draft = useSelector(selectDraft);
  const applied = useSelector(selectApplied);
  const status = useSelector(selectStatus);

  const isBusy = status === 'pending';
  const isDirty = !sameFilters(draft, applied);
  const hasFilters = !sameFilters(draft, EMPTY_FILTERS);
  // An end date before the start date would be rejected by the server anyway.
  const isRangeInvalid =
    Boolean(draft.startDate && draft.endDate) && draft.endDate < draft.startDate;

  const update = (patch) => dispatch(draftChanged(patch));

  const apply = (event) => {
    event.preventDefault();
    dispatch(loadPage({ page: 1, ...draft }));
  };

  const clear = () => {
    dispatch(draftCleared());
    dispatch(loadPage({ page: 1 }));
  };

  return (
    <form className={styles.filters} onSubmit={apply}>
      <div className={styles.field}>
        <label htmlFor="filter-from">From</label>
        <div className={styles.dateControl}>
          <CalendarDays size={16} aria-hidden="true" />
          <input
            id="filter-from"
            type="date"
            value={draft.startDate}
            max={draft.endDate || undefined}
            onChange={(event) => update({ startDate: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="filter-to">To</label>
        <div className={styles.dateControl}>
          <CalendarDays size={16} aria-hidden="true" />
          <input
            id="filter-to"
            type="date"
            value={draft.endDate}
            min={draft.startDate || undefined}
            onChange={(event) => update({ endDate: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="filter-type">Transaction Type</label>
        <select
          id="filter-type"
          className={styles.select}
          value={draft.type}
          onChange={(event) => update({ type: event.target.value })}
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterActions}>
        {/* Disabled until something would actually change. */}
        <button
          type="submit"
          className={styles.apply}
          disabled={!isDirty || isRangeInvalid || isBusy}
        >
          {isBusy ? 'Applying…' : 'Apply Filters'}
        </button>
        <button
          type="button"
          className={styles.clear}
          onClick={clear}
          disabled={!hasFilters || isBusy}
        >
          Clear All
        </button>
      </div>

      {isRangeInvalid && (
        <p className={styles.filterError} role="alert">
          The end date cannot be before the start date.
        </p>
      )}
    </form>
  );
}

export default TransactionFilters;
