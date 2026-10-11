import { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  LayoutGrid,
  Mail,
  MessageSquare,
  Send,
} from 'lucide-react';
import { validateEmail } from '../../../utils/validation';
import cx from '../../../utils/classNames';
import styles from './SupportForm.module.css';

export const CATEGORIES = [
  'Account & profile',
  'Transactions & transfers',
  'Debit cards',
  'Loans',
  'Investments',
  'Beneficiaries',
  'Something else',
];

const MAX_SUBJECT = 120;
const MAX_MESSAGE = 1000;
const MIN_MESSAGE = 10;

const EMPTY = { category: '', email: '', subject: '', message: '' };

/**
 * Not wired to an endpoint yet — submitting only shows the confirmation.
 * `defaultEmail` prefills it for a signed-in customer.
 */
function SupportForm({ defaultEmail = '' }) {
  const [values, setValues] = useState({ ...EMPTY, email: defaultEmail });
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const errors = {
    category: values.category ? '' : 'Choose a category',
    email: validateEmail(values.email),
    subject: values.subject.trim() ? '' : 'Enter a short subject',
    message:
      values.message.trim().length >= MIN_MESSAGE
        ? ''
        : `Describe your issue in at least ${MIN_MESSAGE} characters`,
  };

  const canSubmit = Object.values(errors).every((value) => !value) && !isSubmitting;

  const update = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const reset = () => {
    setValues({ ...EMPTY, email: defaultEmail });
    setTouched(false);
    setIsSent(false);
  };

  const submit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (!canSubmit) return;

    setIsSubmitting(true);
    // Stands in for the request until the endpoint exists.
    window.setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 600);
  };

  if (isSent) {
    return (
      <div className={cx(styles.card, styles.sentCard)}>
        <span className={styles.sentBadge} aria-hidden="true">
          <CheckCircle2 size={30} />
        </span>
        <h2 className={styles.sentTitle}>Request received</h2>
        <p className={styles.sentText}>
          Thanks. Our support team will reply to <strong>{values.email}</strong>{' '}
          as soon as possible.
        </p>
        <p className={styles.note}>
          This form is not connected to the support system yet, so nothing has
          actually been sent.
        </p>
        <button type="button" className={styles.primary} onClick={reset}>
          Send another request
        </button>
      </div>
    );
  }

  const show = (field) => (touched ? errors[field] : '');

  return (
    <form className={styles.card} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="support-category">
          Query Category <span className={styles.required}>*</span>
        </label>
        <div className={styles.control}>
          <LayoutGrid size={18} aria-hidden="true" />
          <select
            id="support-category"
            value={values.category}
            onChange={(event) => update('category', event.target.value)}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        {show('category') && <p className={styles.error}>{errors.category}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="support-email">
          Email Address <span className={styles.required}>*</span>
        </label>
        <div className={styles.control}>
          <Mail size={18} aria-hidden="true" />
          <input
            id="support-email"
            type="email"
            autoComplete="email"
            placeholder="Where should we reply?"
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
          />
        </div>
        {show('email') && <p className={styles.error}>{errors.email}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="support-subject">
          Subject <span className={styles.required}>*</span>
        </label>
        <div className={styles.control}>
          <FileText size={18} aria-hidden="true" />
          <input
            id="support-subject"
            type="text"
            maxLength={MAX_SUBJECT}
            placeholder="Enter a short subject"
            value={values.subject}
            onChange={(event) => update('subject', event.target.value)}
          />
        </div>
        {show('subject') && <p className={styles.error}>{errors.subject}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="support-message">
          Message <span className={styles.required}>*</span>
        </label>
        <div className={cx(styles.control, styles.controlArea)}>
          <MessageSquare size={18} aria-hidden="true" />
          <textarea
            id="support-message"
            rows={5}
            maxLength={MAX_MESSAGE}
            placeholder="Describe your issue or query in detail..."
            value={values.message}
            onChange={(event) => update('message', event.target.value)}
          />
        </div>
        <div className={styles.messageFoot}>
          {show('message') ? (
            <p className={styles.error}>{errors.message}</p>
          ) : (
            <span />
          )}
          <span className={styles.counter}>
            {values.message.length}/{MAX_MESSAGE}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={reset}>
          Reset
        </button>
        {/* Gated until every required field is actually valid. */}
        <button type="submit" className={styles.primary} disabled={!canSubmit}>
          <Send size={18} aria-hidden="true" />
          {isSubmitting ? 'Sending…' : 'Send Request'}
        </button>
      </div>
    </form>
  );
}

export default SupportForm;
