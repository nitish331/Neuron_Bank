import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Unlock,
  User,
  Wifi,
} from 'lucide-react';
import CardActionModal from './CardActionModal';
import NewCardSecrets from './NewCardSecrets';
import {
  detailsHidden,
  issueCard,
  loadCards,
  revealCard,
  selectCards,
  selectCardsError,
  selectCardsStatus,
  selectIssueError,
  selectIssueStatus,
  selectRevealed,
  selectRevealError,
  selectRevealStatus,
} from '../../store/cardsSlice';
import { forgotCardPin } from '../../services/card.service';
import { ApiError } from '../../services/apiClient';
import { formatCurrency } from '../../utils/format';
import cx from '../../utils/classNames';
import styles from './Cards.module.css';

// Mirrors the controller: only these two block issuing another card.
const BLOCKING_STATUSES = ['active', 'frozen'];
// Not usable for payments, so the card visual reads as out of service.
const OUT_OF_SERVICE = ['blocked', 'expired'];

const STATUS_TONES = {
  active: styles.statusActive,
  frozen: styles.statusFrozen,
  blocked: styles.statusBlocked,
  expired: styles.statusExpired,
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function expiry(card) {
  return `${pad(card.expiryMonth)}/${String(card.expiryYear).slice(-2)}`;
}

function groupNumber(cardNumber) {
  return String(cardNumber).replace(/(.{4})/g, '$1 ').trim();
}

function Cards() {
  const dispatch = useDispatch();
  const cards = useSelector(selectCards);
  const status = useSelector(selectCardsStatus);
  const error = useSelector(selectCardsError);
  const issueStatus = useSelector(selectIssueStatus);
  const issueError = useSelector(selectIssueError);
  const revealed = useSelector(selectRevealed);
  const revealStatus = useSelector(selectRevealStatus);
  const revealError = useSelector(selectRevealError);

  const [selectedId, setSelectedId] = useState(null);
  const [action, setAction] = useState(null);
  const [pinNotice, setPinNotice] = useState('');

  useEffect(() => {
    dispatch(loadCards());
    // Leaving the page drops any decrypted values from memory.
    return () => dispatch(detailsHidden());
  }, [dispatch]);

  // Land on the usable card rather than whichever happens to be newest.
  const defaultId = useMemo(() => {
    const usable = cards.find((card) => BLOCKING_STATUSES.includes(card.status));
    return usable?.id ?? cards[0]?.id ?? null;
  }, [cards]);

  const activeId = cards.some((card) => card.id === selectedId)
    ? selectedId
    : defaultId;
  const index = cards.findIndex((card) => card.id === activeId);
  const card = index >= 0 ? cards[index] : null;

  // The revealed values belong to one card, so switching must discard them.
  const select = (nextId) => {
    if (nextId === activeId) return;
    setSelectedId(nextId);
    setPinNotice('');
    dispatch(detailsHidden());
  };

  const step = (offset) => {
    const next = cards[index + offset];
    if (next) select(next.id);
  };

  const sendPinResetLink = async () => {
    setPinNotice('Sending a link…');

    try {
      await forgotCardPin(card.id);
      setPinNotice('We have emailed you a link to set a new PIN. It expires shortly.');
    } catch (requestError) {
      setPinNotice(
        requestError instanceof ApiError
          ? requestError.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const isFrozen = card?.status === 'frozen';
  const isBlocked = card?.status === 'blocked';
  // Expiry is the only status the server will not let the customer change.
  const isExpired = card?.status === 'expired';
  // A blocked card accepts nothing but the unblock, so the rest stay off.
  const canEditCard = Boolean(card) && !isExpired && !isBlocked;
  const canRequest =
    status === 'succeeded' &&
    !cards.some((item) => BLOCKING_STATUSES.includes(item.status));

  const statusLabels = { frozen: 'Unlock Card', blocked: 'Unblock Card' };

  const revealToggle = card && (
    <button
      type="button"
      className={styles.eye}
      onClick={() =>
        revealed ? dispatch(detailsHidden()) : dispatch(revealCard(card.id))
      }
      disabled={revealStatus === 'pending'}
    >
      {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
      <span className="u-visually-hidden">
        {revealed ? 'Hide card number and CVV' : 'Show card number and CVV'}
      </span>
    </button>
  );

  const actions = [
    {
      id: 'status',
      label: statusLabels[card?.status] ?? 'Lock Card',
      icon: isFrozen || isBlocked ? Unlock : Lock,
      onClick: () => setAction('status'),
      disabled: isExpired,
    },
    {
      id: 'pin',
      label: card?.pinSet ? 'Change PIN' : 'Set PIN',
      icon: KeyRound,
      onClick: () => setAction('pin'),
      disabled: !canEditCard,
    },
    {
      id: 'forgot',
      label: 'Forgot PIN',
      icon: RotateCcw,
      onClick: sendPinResetLink,
      disabled: !canEditCard,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Debit Cards</h1>
          <p className={styles.subtitle}>
            Manage your debit cards and card settings.
          </p>
        </div>

        {canRequest && (
          <button
            type="button"
            className={styles.requestButton}
            onClick={() => dispatch(issueCard())}
            disabled={issueStatus === 'pending'}
          >
            <Plus size={18} aria-hidden="true" />
            {issueStatus === 'pending' ? 'Requesting…' : 'Request New Debit Card'}
          </button>
        )}
      </header>

      <NewCardSecrets />

      {status === 'pending' && <div className={styles.cardSkeleton} aria-hidden="true" />}

      {status === 'failed' && (
        <p className={styles.error} role="alert">
          {error?.message || 'Could not load your cards.'}
        </p>
      )}

      {issueError && (
        <p className={styles.error} role="alert">
          {issueError.message}
        </p>
      )}

      {status === 'succeeded' && cards.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <CreditCard size={24} />
          </span>
          <p>You do not have a debit card yet.</p>
          <p className={styles.emptyHint}>
            Request one above to start paying with Neuron Bank.
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <section className={styles.carousel} aria-label="Your debit cards">
          {cards.length > 1 && (
            <button
              type="button"
              className={styles.carouselArrow}
              onClick={() => step(-1)}
              disabled={index <= 0}
            >
              <ChevronLeft size={20} aria-hidden="true" />
              <span className="u-visually-hidden">Previous card</span>
            </button>
          )}

          <ul className={styles.carouselTrack}>
            {cards.map((item) => {
              const isCurrent = item.id === activeId;
              const isDead = OUT_OF_SERVICE.includes(item.status);

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cx(
                      styles.cardVisual,
                      isCurrent && styles.cardCurrent,
                      isDead && styles.cardDead,
                    )}
                    onClick={() => select(item.id)}
                    aria-current={isCurrent}
                  >
                    <span className={styles.cardTop}>
                      <span className={styles.cardBrand}>NEURON BANK</span>
                      <Wifi size={22} aria-hidden="true" className={styles.contactless} />
                    </span>

                    <span className={styles.chip} aria-hidden="true" />

                    <span className={styles.cardNumber}>
                      {isCurrent && revealed ? (
                        groupNumber(revealed.cardNumber)
                      ) : (
                        <>
                          <span aria-hidden="true">•••• •••• ••••</span> {item.last4}
                        </>
                      )}
                    </span>

                    <span className={styles.cardBottom}>
                      <span className={styles.cardHolder}>{item.cardholderName}</span>
                      <span className={styles.cardExpiry}>
                        <small>VALID THRU</small>
                        {expiry(item)}
                      </span>
                      <span className={styles.cardNetwork}>{item.network}</span>
                    </span>

                    {isDead && (
                      <span className={styles.cardDeadBadge}>{item.status}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {cards.length > 1 && (
            <button
              type="button"
              className={styles.carouselArrow}
              onClick={() => step(1)}
              disabled={index >= cards.length - 1}
            >
              <ChevronRight size={20} aria-hidden="true" />
              <span className="u-visually-hidden">Next card</span>
            </button>
          )}
        </section>
      )}

      {cards.length > 1 && (
        <ul className={styles.dots}>
          {cards.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cx(styles.dot, item.id === activeId && styles.dotOn)}
                onClick={() => select(item.id)}
              >
                <span className="u-visually-hidden">
                  Card ending {item.last4}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {card && (
        <>
          <div className={styles.grid}>
            <section className={styles.panel}>
              <header className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Card Details</h2>
                <span className={cx(styles.status, STATUS_TONES[card.status])}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  {card.status}
                </span>
              </header>

              <dl className={styles.details}>
                <div className={styles.detail}>
                  <dt>
                    <User size={17} aria-hidden="true" />
                    Card Holder Name
                  </dt>
                  <dd>{card.cardholderName}</dd>
                </div>

                <div className={styles.detail}>
                  <dt>
                    <CreditCard size={17} aria-hidden="true" />
                    Card Number
                  </dt>
                  <dd className={styles.revealRow}>
                    {revealed
                      ? groupNumber(revealed.cardNumber)
                      : `•••• •••• •••• ${card.last4}`}
                    {revealToggle}
                  </dd>
                </div>

                <div className={styles.detail}>
                  <dt>
                    <Lock size={17} aria-hidden="true" />
                    CVV
                  </dt>
                  {/* Both values come from one request, so either eye toggles both. */}
                  <dd className={styles.revealRow}>
                    {revealed?.cvv || '•••'}
                    {revealToggle}
                  </dd>
                </div>

                <div className={styles.detail}>
                  <dt>
                    <CalendarDays size={17} aria-hidden="true" />
                    Expiry Date
                  </dt>
                  <dd>{expiry(card)}</dd>
                </div>

                <div className={styles.detail}>
                  <dt>
                    <KeyRound size={17} aria-hidden="true" />
                    PIN
                  </dt>
                  <dd>{card.pinSet ? 'Set' : 'Not set yet'}</dd>
                </div>
              </dl>

              {revealError && (
                <p className={styles.error} role="alert">
                  {revealError.message}
                </p>
              )}
            </section>

            <section className={styles.panel}>
              <header className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Card Actions</h2>
              </header>

              {isExpired && (
                <p className={styles.notice}>
                  This card has expired and can no longer be changed. Request a
                  new one to keep paying.
                </p>
              )}

              {isBlocked && (
                <p className={styles.notice}>
                  This card is blocked. Unblock it to set a PIN or change its
                  limit, which only works while no other card is in use.
                </p>
              )}

              <ul className={styles.actions}>
                {actions.map(({ id, label, icon: Icon, onClick, disabled }) => (
                  <li key={id}>
                    <button
                      type="button"
                      className={styles.action}
                      onClick={onClick}
                      disabled={disabled}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>

              {pinNotice && (
                <p className={styles.notice} role="status">
                  {pinNotice}
                </p>
              )}
            </section>
          </div>

          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Transaction Limit</h2>
                <p className={styles.panelSubtitle}>
                  Set and manage the daily spending limit for this card.
                </p>
              </div>
              <button
                type="button"
                className={styles.editLimit}
                onClick={() => setAction('limit')}
                disabled={!canEditCard}
              >
                Edit Limit
              </button>
            </header>

            <div className={styles.limit}>
              <span className={styles.limitIcon} aria-hidden="true">
                <CreditCard size={20} />
              </span>
              <div>
                <p className={styles.limitLabel}>Current daily limit</p>
                <p className={styles.limitValue}>{formatCurrency(card.dailyLimit)}</p>
              </div>
            </div>
          </section>
        </>
      )}

      <CardActionModal
        open={Boolean(action)}
        action={action}
        card={card}
        onClose={() => setAction(null)}
      />
    </div>
  );
}

export default Cards;
