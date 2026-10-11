import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import {
  addReset,
  createBeneficiary,
  selectAddError,
  selectAddStatus,
} from '../../store/beneficiariesSlice';
import styles from './Beneficiaries.module.css';

const MIN_ACCOUNT = 6;
const MAX_ACCOUNT = 32;

/** Mirrors addBeneficiaryValidation in the backend. */
function validateAccountNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Account number is required';
  if (trimmed.length < MIN_ACCOUNT || trimmed.length > MAX_ACCOUNT) {
    return `Account number must be between ${MIN_ACCOUNT} and ${MAX_ACCOUNT} characters`;
  }
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return 'Account number must be letters and numbers only';
  }
  return '';
}

function validateName(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'Account holder name is required';
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Account holder name must be between 2 and 100 characters';
  }
  return '';
}

function AddBeneficiaryModal({ open, onClose }) {
  const dispatch = useDispatch();
  const status = useSelector(selectAddStatus);
  const error = useSelector(selectAddError);

  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [added, setAdded] = useState(null);

  useEffect(() => {
    if (!open) return;

    dispatch(addReset());
    setAccountNumber('');
    setName('');
    setTouched(false);
    setAdded(null);
  }, [open, dispatch]);

  const accountError = validateAccountNumber(accountNumber);
  const nameError = validateName(name);
  const isSubmitting = status === 'pending';
  const canSubmit = !accountError && !nameError && !isSubmitting;

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    const action = await dispatch(createBeneficiary({ accountNumber, name }));
    if (createBeneficiary.fulfilled.match(action)) setAdded(action.payload);
  };

  return (
    <Modal
      open={open}
      title={added ? 'Beneficiary added' : 'Add New Beneficiary'}
      onClose={onClose}
    >
      {added ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={28} />
          </span>
          <p className={styles.modalText}>
            <strong>{added.name}</strong> is saved and ready to receive transfers.
          </p>
          <p className={styles.modalHint}>Account {added.accountNumber}</p>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.modalForm} onSubmit={submit} noValidate>
          <p className={styles.modalText}>
            Both the account number and the holder name must match a Neuron Bank
            account exactly.
          </p>

          {error?.message && (
            <p className={styles.modalError} role="alert">
              {error.message}
            </p>
          )}

          <label className={styles.field}>
            <span>Account Number</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="SAV99392269933500"
              maxLength={MAX_ACCOUNT}
              value={accountNumber}
              onBlur={() => setTouched(true)}
              // The server uppercases anyway, so match it as the user types.
              onChange={(event) =>
                setAccountNumber(
                  event.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
                )
              }
            />
          </label>
          {touched && accountError && (
            <p className={styles.fieldError}>{accountError}</p>
          )}

          <label className={styles.field}>
            <span>Account Holder Name</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="As registered with the account"
              maxLength={100}
              value={name}
              onBlur={() => setTouched(true)}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {touched && nameError && <p className={styles.fieldError}>{nameError}</p>}

          <div className={styles.modalActions}>
            <button type="button" className={styles.modalGhost} onClick={onClose}>
              Cancel
            </button>
            {/* Gated until both fields satisfy the server's own rules. */}
            <button type="submit" className={styles.modalPrimary} disabled={!canSubmit}>
              {isSubmitting ? 'Checking…' : 'Add Beneficiary'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default AddBeneficiaryModal;
