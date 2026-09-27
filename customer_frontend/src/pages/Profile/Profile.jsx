import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BadgeCheck,
  CalendarDays,
  Hash,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { selectUser } from '../../store/authSlice';
import cx from '../../utils/classNames';
import styles from './Profile.module.css';

const DOB = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDob(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DOB.format(date);
}

const STATUS_TONES = {
  active: styles.statusActive,
  pending: styles.statusPending,
};

function Profile() {
  const user = useSelector(selectUser);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const name = user?.name?.trim() || 'Your account';
  const initial = name.charAt(0).toUpperCase();

  // Only what the API actually returns; anything missing is left out entirely.
  const rows = [
    { id: 'name', icon: User, label: 'Full Name', value: user?.name },
    { id: 'email', icon: Mail, label: 'Email Address', value: user?.email },
    { id: 'phone', icon: Phone, label: 'Mobile Number', value: user?.phoneNumber },
    {
      id: 'dob',
      icon: CalendarDays,
      label: 'Date of Birth',
      value: formatDob(user?.dateOfBirth),
    },
    {
      id: 'account',
      icon: Hash,
      label: 'Account Number',
      value: user?.accountNumber,
    },
  ].filter((row) => Boolean(row.value));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>
          Manage your personal information and account settings.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Personal Information</h2>
          </header>

          <dl className={styles.details}>
            {rows.map(({ id, icon: Icon, label, value }) => (
              <div key={id} className={styles.detail}>
                <dt className={styles.detailLabel}>
                  <span className={styles.detailIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  {label}
                </dt>
                <dd className={styles.detailValue}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={cx(styles.card, styles.identity)}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>

          <h2 className={styles.identityName}>{name}</h2>
          {user?.email && <p className={styles.identityEmail}>{user.email}</p>}

          {user?.accountStatus && (
            <span
              className={cx(
                styles.status,
                STATUS_TONES[user.accountStatus] || styles.statusOther,
              )}
            >
              <BadgeCheck size={14} aria-hidden="true" />
              Account {user.accountStatus}
            </span>
          )}

          <button
            type="button"
            className={styles.passwordButton}
            onClick={() => setPasswordOpen(true)}
          >
            <Lock size={18} aria-hidden="true" />
            Change Password
          </button>
        </section>
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        email={user?.email}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}

export default Profile;
