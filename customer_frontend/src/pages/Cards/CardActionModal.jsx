import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, MailCheck } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import {
  applyCardChange,
  changeReset,
  requestOtp,
  selectChangeError,
  selectChangeStatus,
  selectOtpError,
  selectOtpStatus,
} from '../../store/cardsSlice';
import cx from '../../utils/classNames';
import styles from './Cards.module.css';

const CODE_LENGTH = 6;
const PIN_LENGTH = 4;
const MIN_LIMIT = 1000;
const MAX_LIMIT = 200000;

/** Mirrors pinValidation() in backend/middleware/debitCard.validation.js. */
function validatePin(pin) {
  if (pin.length !== PIN_LENGTH) return `PIN must be ${PIN_LENGTH} digits`;
  if (/^(\d)\1{3}$/.test(pin)) return 'PIN must not be the same digit four times';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) {
    return 'PIN must not be four digits in a row';
  }
  return '';
}

function validateLimit(value) {
  const amount = Number(value);
  if (!value || Number.isNaN(amount)) return 'Enter a daily limit';
  if (!Number.isInteger(amount)) return 'Daily limit must be a whole number';
  if (amount < MIN_LIMIT || amount > MAX_LIMIT) {
    return `Daily limit must be between ₹${MIN_LIMIT.toLocaleString('en-IN')} and ₹${MAX_LIMIT.toLocaleString('en-IN')}`;
  }
  return '';
}

const TITLES = {
  status: 'Change card status',
  pin: 'Set a new PIN',
  limit: 'Edit transaction limit',
};

function CardActionModal({ open, action, card, onClose }) {
  const dispatch = useDispatch();
  const otpStatus = useSelector(selectOtpStatus);
  const otpError = useSelector(selectOtpError);
  const changeStatus = useSelector(selectChangeStatus);
  const changeError = useSelector(selectChangeError);

  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [limit, setLimit] = useState('');

  useEffect(() => {
    if (!open) return;

    dispatch(changeReset());
    setCode('');
    setPin('');
    setConfirmPin('');
    setLimit(String(card?.dailyLimit ?? ''));
  }, [open, card, dispatch]);

  if (!action) return null;

  // Only an active card is being locked; frozen and blocked are both going back.
  const nextStatus = card?.status === 'active' ? 'frozen' : 'active';

  const pinError = pin ? validatePin(pin) : '';
  const confirmError = confirmPin && pin !== confirmPin ? 'PINs do not match' : '';
  const limitError = action === 'limit' && limit ? validateLimit(limit) : '';

  const detailsReady =
    action === 'status' ||
    (action === 'pin' && !validatePin(pin) && pin === confirmPin) ||
    (action === 'limit' &&
      !validateLimit(limit) &&
      Number(limit) !== card?.dailyLimit);

  const isSent = otpStatus === 'sent';
  const canSubmit =
    detailsReady && code.length === CODE_LENGTH && changeStatus !== 'pending';

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    const changes = { cardId: card.id, code };
    if (action === 'status') changes.status = nextStatus;
    if (action === 'pin') changes.pin = pin;
    if (action === 'limit') changes.dailyLimit = Number(limit);

    dispatch(applyCardChange(changes));
  };

  return (
    <Modal open={open} title={TITLES[action]} onClose={onClose}>
      {changeStatus === 'succeeded' ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={28} />
          </span>
          <p className={styles.modalText}>
            {action === 'status' &&
              `Your card is now ${nextStatus === 'frozen' ? 'locked' : 'active'}.`}
            {action === 'pin' && 'Your new PIN is set.'}
            {action === 'limit' && 'Your daily limit has been updated.'}
          </p>
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.modalForm} onSubmit={submit} noValidate>
          {action === 'status' && (
            <p className={styles.modalText}>
              {card?.status === 'frozen' &&
                'Unlocking lets this card be used for payments again.'}
              {card?.status === 'blocked' &&
                'Unblocking puts this card back in service. It only works while no other card of yours is active or locked.'}
              {card?.status === 'active' &&
                'Locking blocks all payments on this card. You can unlock it at any time.'}
            </p>
          )}

          {action === 'pin' && (
            <>
              <label className={styles.field}>
                <span>New PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  placeholder="····"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))
                  }
                />
              </label>
              {pinError && <p className={styles.fieldError}>{pinError}</p>}

              <label className={styles.field}>
                <span>Confirm PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  placeholder="····"
                  maxLength={PIN_LENGTH}
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(
                      event.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH),
                    )
                  }
                />
              </label>
              {confirmError && <p className={styles.fieldError}>{confirmError}</p>}
            </>
          )}

          {action === 'limit' && (
            <>
              <label className={styles.field}>
                <span>Daily transaction limit</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={limit}
                  onChange={(event) =>
                    setLimit(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
              </label>
              {limitError ? (
                <p className={styles.fieldError}>{limitError}</p>
              ) : (
                <p className={styles.fieldHint}>
                  Between ₹{MIN_LIMIT.toLocaleString('en-IN')} and ₹
                  {MAX_LIMIT.toLocaleString('en-IN')}.
                </p>
              )}
            </>
          )}

          <div className={styles.otpBlock}>
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
                {/* The code is single use, so it is only sent once the change is ready. */}
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={() => dispatch(requestOtp(card.id))}
                  disabled={!detailsReady || otpStatus === 'pending'}
                >
                  {otpStatus === 'pending' ? 'Sending…' : 'Email me a code'}
                </button>
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
                      setCode(
                        event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
                      )
                    }
                  />
                </label>

                {changeError && (
                  <p className={styles.modalError} role="alert">
                    {changeError.message}
                  </p>
                )}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalGhost}
                    onClick={() => dispatch(requestOtp(card.id))}
                    disabled={otpStatus === 'pending'}
                  >
                    Resend
                  </button>
                  <button
                    type="submit"
                    className={cx(styles.modalPrimary)}
                    disabled={!canSubmit}
                  >
                    {changeStatus === 'pending' ? 'Confirming…' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}

export default CardActionModal;
