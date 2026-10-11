import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import {
  changeReset,
  changeStatus,
  selectChangeError,
  selectChangingId,
  selectLastChange,
} from '../../store/customersSlice';
import styles from './Customers.module.css';

const MIN_REASON = 5;
const MAX_REASON = 300;

function StatusModal({ open, customer, next, onClose }) {
  const dispatch = useDispatch();
  const changingId = useSelector(selectChangingId);
  const error = useSelector(selectChangeError);
  const lastChange = useSelector(selectLastChange);

  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    dispatch(changeReset());
    setReason('');
    setDone(false);
  }, [open, customer, dispatch]);

  if (!customer || !next) return null;

  const isSuspending = next === 'suspended';
  const isBusy = changingId === customer.id;

  // The server only demands a reason when suspending; lifting one needs none.
  const reasonError =
    isSuspending &&
    (reason.trim().length < MIN_REASON || reason.trim().length > MAX_REASON)
      ? `Reason must be between ${MIN_REASON} and ${MAX_REASON} characters`
      : '';

  const submit = async (event) => {
    event.preventDefault();
    if (reasonError || isBusy) return;

    const action = await dispatch(
      changeStatus({ userId: customer.id, status: next, reason }),
    );

    if (changeStatus.fulfilled.match(action)) setDone(true);
  };

  return (
    <Modal
      open={open}
      title={isSuspending ? 'Suspend customer' : 'Restore access'}
      onClose={onClose}
    >
      {done ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.modalText}>{lastChange?.message}</p>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.modalForm} onSubmit={submit} noValidate>
          {isSuspending ? (
            <div className={styles.warning}>
              <TriangleAlert size={20} aria-hidden="true" />
              <p>
                <strong>{customer.name}</strong> will be signed out everywhere and
                blocked from signing back in. Their money and records are left
                untouched.
              </p>
            </div>
          ) : (
            <p className={styles.modalText}>
              <strong>{customer.name}</strong> will be able to sign in and bank
              again.
            </p>
          )}

          <p className={styles.modalHint}>{customer.email}</p>

          {isSuspending && (
            <>
              <label className={styles.field} htmlFor="suspend-reason">
                <span>Why is this account being suspended?</span>
                <textarea
                  id="suspend-reason"
                  rows={3}
                  maxLength={MAX_REASON}
                  placeholder="Recorded for the audit trail."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <p className={styles.counter}>
                {reason.length}/{MAX_REASON}
              </p>
            </>
          )}

          {error && (
            <p className={styles.modalError} role="alert">
              {error.message}
            </p>
          )}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalGhost}
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </button>
            {/* Gated until the reason the server requires is actually valid. */}
            <button
              type="submit"
              className={isSuspending ? styles.modalDanger : styles.modalPrimary}
              disabled={Boolean(reasonError) || isBusy}
            >
              {isBusy
                ? 'Working…'
                : isSuspending
                  ? 'Suspend customer'
                  : 'Restore access'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default StatusModal;
