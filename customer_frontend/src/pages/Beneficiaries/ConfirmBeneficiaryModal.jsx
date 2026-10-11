import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, MailCheck } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import {
  actionReset,
  changeBeneficiaryStatus,
  deleteBeneficiary,
  requestBeneficiaryOtp,
  selectActionError,
  selectActionStatus,
  selectOtpError,
  selectOtpStatus,
} from '../../store/beneficiariesSlice';
import styles from './Beneficiaries.module.css';

const CODE_LENGTH = 6;

const COPY = {
  delete: {
    title: 'Remove beneficiary',
    body: (name) =>
      `${name} will be removed from your saved beneficiaries. You can add them again later.`,
    confirm: 'Remove',
    done: (name) => `${name} has been removed.`,
  },
  disable: {
    title: 'Disable beneficiary',
    body: (name) => `${name} will be kept but blocked from receiving transfers.`,
    confirm: 'Disable',
    done: (name) => `${name} is now disabled.`,
  },
  enable: {
    title: 'Enable beneficiary',
    body: (name) => `${name} will be able to receive transfers again.`,
    confirm: 'Enable',
    done: (name) => `${name} is now active.`,
  },
};

function ConfirmBeneficiaryModal({ open, intent, beneficiary, onClose }) {
  const dispatch = useDispatch();
  const otpStatus = useSelector(selectOtpStatus);
  const otpError = useSelector(selectOtpError);
  const actionStatus = useSelector(selectActionStatus);
  const actionError = useSelector(selectActionError);

  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) return;
    dispatch(actionReset());
    setCode('');
  }, [open, dispatch]);

  if (!intent || !beneficiary) return null;

  const copy = COPY[intent];
  // The server ties the code to one action, so ask for the matching one.
  const otpAction = intent === 'delete' ? 'delete' : 'update';
  const isSent = otpStatus === 'sent';
  const canConfirm = code.length === CODE_LENGTH && actionStatus !== 'pending';

  const confirm = (event) => {
    event.preventDefault();
    if (!canConfirm) return;

    if (intent === 'delete') {
      dispatch(deleteBeneficiary({ id: beneficiary.id, code }));
    } else {
      dispatch(
        changeBeneficiaryStatus({
          id: beneficiary.id,
          code,
          status: intent === 'disable' ? 'disabled' : 'active',
        }),
      );
    }
  };

  return (
    <Modal open={open} title={copy.title} onClose={onClose}>
      {actionStatus === 'succeeded' ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={28} />
          </span>
          <p className={styles.modalText}>{copy.done(beneficiary.name)}</p>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.modalForm} onSubmit={confirm} noValidate>
          <p className={styles.modalText}>{copy.body(beneficiary.name)}</p>
          <p className={styles.modalHint}>Account {beneficiary.accountNumber}</p>

          {!isSent ? (
            <>
              <p className={styles.modalHint}>
                A 6-digit code is emailed to confirm this change.
              </p>
              {otpError && (
                <p className={styles.modalError} role="alert">
                  {otpError.message}
                </p>
              )}
              <div className={styles.modalActions}>
                <button type="button" className={styles.modalGhost} onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={() =>
                    dispatch(
                      requestBeneficiaryOtp({
                        id: beneficiary.id,
                        action: otpAction,
                      }),
                    )
                  }
                  disabled={otpStatus === 'pending'}
                >
                  {otpStatus === 'pending' ? 'Sending…' : 'Email me a code'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.sentNote}>
                <MailCheck size={16} aria-hidden="true" />
                Code sent. Enter it below to confirm.
              </p>

              <label className={styles.field}>
                <span>Confirmation code</span>
                <input
                  className={styles.codeInput}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="______"
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                  }
                />
              </label>

              {actionError && (
                <p className={styles.modalError} role="alert">
                  {actionError.message}
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalGhost}
                  onClick={() =>
                    dispatch(
                      requestBeneficiaryOtp({
                        id: beneficiary.id,
                        action: otpAction,
                      }),
                    )
                  }
                  disabled={otpStatus === 'pending'}
                >
                  Resend
                </button>
                <button
                  type="submit"
                  className={intent === 'delete' ? styles.modalDanger : styles.modalPrimary}
                  disabled={!canConfirm}
                >
                  {actionStatus === 'pending' ? 'Confirming…' : copy.confirm}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

export default ConfirmBeneficiaryModal;
