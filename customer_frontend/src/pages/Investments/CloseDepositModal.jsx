import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, MailCheck, TriangleAlert } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import {
  closeReset,
  confirmClose,
  loadDeposits,
  requestCloseOtp,
  selectCloseError,
  selectCloseResult,
  selectCloseStatus,
  selectOtpError,
  selectOtpStatus,
  selectRates,
} from '../../store/investmentsSlice';
import { loadAnalytics, selectAnalyticsMonths } from '../../store/analyticsSlice';
import { formatCurrency } from '../../utils/format';
import styles from './Investments.module.css';

const CODE_LENGTH = 6;

function CloseDepositModal({ open, product, deposit, onClose }) {
  const dispatch = useDispatch();
  const rates = useSelector(selectRates(product));
  const otpStatus = useSelector(selectOtpStatus);
  const otpError = useSelector(selectOtpError);
  const closeStatus = useSelector(selectCloseStatus);
  const closeError = useSelector(selectCloseError);
  const result = useSelector(selectCloseResult);
  const analyticsMonths = useSelector(selectAnalyticsMonths);

  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) return;
    dispatch(closeReset());
    setCode('');
  }, [open, dispatch]);

  if (!deposit) return null;

  const isMatured = deposit.status === 'matured';
  const canConfirm = code.length === CODE_LENGTH && closeStatus !== 'pending';

  const submit = async (event) => {
    event.preventDefault();
    if (!canConfirm) return;

    const action = await dispatch(
      confirmClose({ product, depositId: deposit.id, code }),
    );

    if (confirmClose.fulfilled.match(action)) {
      dispatch(loadDeposits(product));
      dispatch(loadAnalytics({ months: analyticsMonths }));
    }
  };

  return (
    <Modal open={open} title="Close deposit" onClose={onClose}>
      {closeStatus === 'succeeded' ? (
        <div className={styles.modalBody}>
          <span className={styles.modalBadgeGood} aria-hidden="true">
            <CheckCircle2 size={30} />
          </span>
          <p className={styles.modalText}>{result?.message}</p>
          {result?.deposit?.payoutAmount != null && (
            <dl className={styles.receipt}>
              <div>
                <dt>Credited</dt>
                <dd>{formatCurrency(result.deposit.payoutAmount)}</dd>
              </div>
              {Boolean(result.deposit.penaltyAmount) && (
                <div>
                  <dt>Early closure charge</dt>
                  <dd>{formatCurrency(result.deposit.penaltyAmount)}</dd>
                </div>
              )}
            </dl>
          )}
          <button type="button" className={styles.modalPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form className={styles.modalForm} onSubmit={submit} noValidate>
          {!isMatured && (
            <div className={styles.warning}>
              <TriangleAlert size={20} aria-hidden="true" />
              <p>
                This deposit has not matured. Closing now applies a{' '}
                {rates?.prematureClosurePenaltyPercent ?? 1}% charge and you lose
                the full maturity value.
              </p>
            </div>
          )}

          <dl className={styles.receipt}>
            <div>
              <dt>Deposit</dt>
              <dd>{deposit.depositNumber}</dd>
            </div>
            <div>
              <dt>{product === 'fd' ? 'Principal' : 'Deposited so far'}</dt>
              <dd>
                {formatCurrency(
                  product === 'fd' ? deposit.principal : deposit.totalDeposited,
                )}
              </dd>
            </div>
            <div>
              <dt>Matures</dt>
              <dd>{new Date(deposit.maturityDate).toLocaleDateString('en-IN')}</dd>
            </div>
          </dl>

          {otpStatus !== 'sent' ? (
            <>
              <p className={styles.modalHint}>
                A 6-digit code is emailed to confirm this closure.
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
                    dispatch(requestCloseOtp({ product, depositId: deposit.id }))
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

              {closeError && (
                <p className={styles.modalError} role="alert">
                  {closeError.message}
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalGhost}
                  onClick={() =>
                    dispatch(requestCloseOtp({ product, depositId: deposit.id }))
                  }
                  disabled={otpStatus === 'pending'}
                >
                  Resend
                </button>
                <button type="submit" className={styles.modalDanger} disabled={!canConfirm}>
                  {closeStatus === 'pending' ? 'Closing…' : 'Close deposit'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
}

export default CloseDepositModal;
