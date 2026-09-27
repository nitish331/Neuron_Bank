import { useEffect, useState } from 'react';
import { MailCheck, ShieldQuestion } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import { requestPasswordReset } from '../../services/password.service';
import { ApiError } from '../../services/apiClient';
import styles from './Profile.module.css';

/**
 * There is no authenticated change-password endpoint, so this sends the same
 * emailed reset link as the forgotten-password flow.
 */
function ChangePasswordModal({ open, email, onClose }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatus('idle');
    setError('');
  }, [open]);

  const send = async () => {
    setStatus('pending');
    setError('');

    try {
      await requestPasswordReset(email);
      setStatus('sent');
    } catch (requestError) {
      setStatus('idle');
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  return (
    <Modal
      open={open}
      title={status === 'sent' ? 'Check your email' : 'Change password'}
      onClose={onClose}
    >
      {status === 'sent' ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <MailCheck size={28} />
          </span>
          <p className={styles.modalText}>
            If <strong>{email}</strong> is registered, a reset link is on its way.
            It expires shortly, so use it soon.
          </p>
          <p className={styles.modalHint}>
            Setting a new password signs you out on every device.
          </p>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <div className={styles.modalBody}>
          <span className={styles.modalBadge} aria-hidden="true">
            <ShieldQuestion size={28} />
          </span>
          <p className={styles.modalText}>
            We&apos;ll email a secure reset link to <strong>{email}</strong>. You
            set the new password from there.
          </p>

          {error && (
            <p className={styles.modalError} role="alert">
              {error}
            </p>
          )}

          <div className={styles.modalActions}>
            <button type="button" className={styles.modalGhost} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.modalPrimary}
              onClick={send}
              disabled={!email || status === 'pending'}
            >
              {status === 'pending' ? 'Sending…' : 'Send reset link'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ChangePasswordModal;
