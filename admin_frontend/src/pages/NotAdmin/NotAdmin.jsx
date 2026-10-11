import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Logo from '../../components/common/Logo/Logo';
import { logoutUser, selectUser } from '../../store/authSlice';
import { ROUTES } from '../../routes/paths';
import styles from './NotAdmin.module.css';

/** Signed in, but not with an admin account. */
function NotAdmin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const handleSignOut = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Logo variant="horizontal" linked={false} />

        <span className={styles.icon} aria-hidden="true">
          <ShieldAlert size={28} />
        </span>

        <h1 className={styles.title}>Admin access only</h1>
        <p className={styles.text}>
          {user?.email ? <strong>{user.email}</strong> : 'This account'} is not an
          administrator, so it cannot open the Neuron Bank admin panel.
        </p>
        <p className={styles.hint}>
          Customers should use the main Neuron Bank app instead.
        </p>

        <button type="button" className={styles.primary} onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}

export default NotAdmin;
