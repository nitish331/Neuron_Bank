import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import NotFound from '../pages/NotFound/NotFound';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../components/dashboard/DashboardLayout/DashboardLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import Transactions from '../pages/Transactions/Transactions';
import Profile from '../pages/Profile/Profile';
import ResetPassword from '../pages/ResetPassword/ResetPassword';
import SetCardPin from '../pages/SetCardPin/SetCardPin';
import Cards from '../pages/Cards/Cards';
import ComingSoon from '../pages/Dashboard/ComingSoon';
import { ROUTES } from './paths';

/** Sidebar destinations without a screen yet. */
const PLACEHOLDER_ROUTES = [
  ROUTES.dashboardAccounts,
  ROUTES.dashboardInvestments,
  ROUTES.dashboardLoans,
  ROUTES.dashboardSupport,
];

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<Home />} />
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.register} element={<Register />} />
      <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
      <Route path={ROUTES.setCardPin} element={<SetCardPin />} />

      {/* Every dashboard route sits behind the active-account gate. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.dashboardTransactions} element={<Transactions />} />
          <Route path={ROUTES.dashboardProfile} element={<Profile />} />
          <Route path={ROUTES.dashboardCards} element={<Cards />} />
          {PLACEHOLDER_ROUTES.map((path) => (
            <Route key={path} path={path} element={<ComingSoon />} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
