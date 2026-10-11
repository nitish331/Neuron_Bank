import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/Login/Login';
import AdminLayout from '../components/layout/AdminLayout/AdminLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import Approvals from '../pages/Approvals/Approvals';
import LoanApprovals from '../pages/LoanApprovals/LoanApprovals';
import InterestRates from '../pages/InterestRates/InterestRates';
import Customers from '../pages/Customers/Customers';
import { ROUTES } from './paths';

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<Login />} />

      {/* Everything else requires an admin session. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.approvals} element={<Approvals />} />
          <Route path={ROUTES.loanApprovals} element={<LoanApprovals />} />
          <Route path={ROUTES.customers} element={<Customers />} />
          <Route path={ROUTES.interestRates} element={<InterestRates />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  );
}

export default AppRoutes;
