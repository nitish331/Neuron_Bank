import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Ban,
  CheckCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import AddBeneficiaryModal from './AddBeneficiaryModal';
import ConfirmBeneficiaryModal from './ConfirmBeneficiaryModal';
import {
  loadBeneficiaries,
  selectBeneficiaries,
  selectBeneficiariesError,
  selectBeneficiariesStatus,
} from '../../store/beneficiariesSlice';
import cx from '../../utils/classNames';
import styles from './Beneficiaries.module.css';

const SORTS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'name', label: 'Name (A–Z)' },
];

// Deterministic per name, so a beneficiary keeps the same colour between visits.
const AVATAR_TONES = [
  styles.avatarViolet,
  styles.avatarBlue,
  styles.avatarTeal,
  styles.avatarAmber,
  styles.avatarPink,
];

function toneFor(name) {
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function maskAccount(accountNumber) {
  const value = String(accountNumber);
  return value.length <= 8
    ? value
    : `${value.slice(0, 4)} •••• ${value.slice(-4)}`;
}

function Beneficiaries() {
  const dispatch = useDispatch();
  const beneficiaries = useSelector(selectBeneficiaries);
  const status = useSelector(selectBeneficiariesStatus);
  const error = useSelector(selectBeneficiariesError);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [addOpen, setAddOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [confirm, setConfirm] = useState({ intent: null, beneficiary: null });
  const menuRef = useRef(null);

  useEffect(() => {
    dispatch(loadBeneficiaries());
  }, [dispatch]);

  useEffect(() => {
    if (!menuFor) return undefined;

    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuFor(null);
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor]);

  // The list is not paginated, so filtering and sorting stay on the client.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = needle
      ? beneficiaries.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.accountNumber.toLowerCase().includes(needle),
        )
      : beneficiaries;

    return [...filtered].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : new Date(b.createdAt) - new Date(a.createdAt),
    );
  }, [beneficiaries, query, sort]);

  const openConfirm = (intent, beneficiary) => {
    setMenuFor(null);
    setConfirm({ intent, beneficiary });
  };

  const isEmpty = status === 'succeeded' && beneficiaries.length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Beneficiary Accounts</h1>
          <p className={styles.subtitle}>
            Add and manage your beneficiary accounts for quick and secure
            transactions.
          </p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={18} aria-hidden="true" />
          Add New Beneficiary
        </button>
      </header>

      <section className={styles.panel}>
        {!isEmpty && (
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={18} aria-hidden="true" />
              <span className="u-visually-hidden">Search beneficiaries</span>
              <input
                type="search"
                placeholder="Search beneficiaries by name or account number..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <label className={styles.sort}>
              <span className="u-visually-hidden">Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {status === 'pending' && (
          <ul className={styles.skeletonList} aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className={styles.skeletonRow} />
            ))}
          </ul>
        )}

        {status === 'failed' && (
          <p className={styles.error} role="alert">
            {error?.message || 'Could not load your beneficiaries.'}
          </p>
        )}

        {isEmpty && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Users size={24} />
            </span>
            <p>No beneficiaries saved yet.</p>
            <p className={styles.emptyHint}>
              Add one to send money without retyping account details.
            </p>
          </div>
        )}

        {status === 'succeeded' && beneficiaries.length > 0 && visible.length === 0 && (
          <div className={styles.emptyState}>
            <p>Nothing matches &ldquo;{query}&rdquo;.</p>
            <p className={styles.emptyHint}>Try a different name or account number.</p>
          </div>
        )}

        <ul className={styles.list}>
          {visible.map((item) => {
            const isDisabled = item.status === 'disabled';

            return (
              <li
                key={item.id}
                className={cx(styles.row, isDisabled && styles.rowDisabled)}
              >
                <span className={cx(styles.avatar, toneFor(item.name))} aria-hidden="true">
                  {item.name.trim().charAt(0).toUpperCase()}
                </span>

                <div className={styles.rowMeta}>
                  <p className={styles.rowName}>
                    {item.name}
                    {isDisabled && (
                      <span className={styles.disabledTag}>Disabled</span>
                    )}
                  </p>
                  <p className={styles.rowBank}>Neuron Bank</p>
                </div>

                <p className={styles.rowAccount}>{maskAccount(item.accountNumber)}</p>

                <div
                  className={styles.rowActions}
                  ref={menuFor === item.id ? menuRef : undefined}
                >
                  <button
                    type="button"
                    className={styles.menuButton}
                    onClick={() => setMenuFor(menuFor === item.id ? null : item.id)}
                    aria-expanded={menuFor === item.id}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                    <span className="u-visually-hidden">
                      Actions for {item.name}
                    </span>
                  </button>

                  {menuFor === item.id && (
                    <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() =>
                          openConfirm(isDisabled ? 'enable' : 'disable', item)
                        }
                      >
                        {isDisabled ? (
                          <CheckCircle size={16} aria-hidden="true" />
                        ) : (
                          <Ban size={16} aria-hidden="true" />
                        )}
                        {isDisabled ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        type="button"
                        className={cx(styles.menuItem, styles.menuItemDanger)}
                        role="menuitem"
                        onClick={() => openConfirm('delete', item)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <AddBeneficiaryModal open={addOpen} onClose={() => setAddOpen(false)} />

      <ConfirmBeneficiaryModal
        open={Boolean(confirm.intent)}
        intent={confirm.intent}
        beneficiary={confirm.beneficiary}
        onClose={() => setConfirm({ intent: null, beneficiary: null })}
      />
    </div>
  );
}

export default Beneficiaries;
