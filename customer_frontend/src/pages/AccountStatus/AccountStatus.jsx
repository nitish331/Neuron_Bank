import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Hourglass, ShieldAlert } from 'lucide-react';
import Logo from '../../components/common/Logo/Logo';
import { logoutUser, selectUser } from '../../store/authSlice';
import { ROUTES } from '../../routes/paths';
import cx from '../../utils/classNames';
import styles from './AccountStatus.module.css';

const TONES = {
  pending: { icon: Hourglass, className: styles.isPending },
  stopped: { icon: ShieldAlert, className: styles.isStopped },
};

/** Shown after login and by the dashboard guard, so both say the same thing. */
function AccountStatus({ state, name, standalone = true }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const holder = name || user?.name;
  const { icon: Icon, className } = TONES[state.tone];

  const handleSignOut = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.login, { replace: true });
  };

  const body = (
    <div className={styles.card}>
      {standalone && <Logo variant="horizontal" />}

      <span className={cx(styles.icon, className)} aria-hidden="true">
        <Icon size={28} />
      </span>

      <div>
        <h1 className={styles.title}>{state.title}</h1>
        {holder && <p className={styles.holder}>Signed in as {holder}</p>}
      </div>

      <p className={styles.text}>{state.message}</p>

      <div className={styles.actions}>
        <Link to={ROUTES.home} className={styles.primary}>
          Back to home
        </Link>
        <button type="button" className={styles.ghost} onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );

  if (!standalone) return body;

  return <main className={styles.page}>{body}</main>;
}

export default AccountStatus;
