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
import Beneficiaries from '../pages/Beneficiaries/Beneficiaries';
import Investments from '../pages/Investments/Investments';
import Loans from '../pages/Loans/Loans';
import Support from '../pages/Support/Support';
import ProductPage from '../pages/Product/ProductPage';
import ResetPassword from '../pages/ResetPassword/ResetPassword';
import SetCardPin from '../pages/SetCardPin/SetCardPin';
import Cards from '../pages/Cards/Cards';
import { ROUTES } from './paths';

function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<Home />} />
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.register} element={<Register />} />
      <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
      <Route path={ROUTES.setCardPin} element={<SetCardPin />} />
      <Route path={ROUTES.support} element={<Support standalone />} />

      {/* Public product pages behind the marketing nav and footer links. */}
      <Route path={ROUTES.accounts} element={<ProductPage product="accounts" />} />
      <Route path={ROUTES.cards} element={<ProductPage product="cards" />} />
      <Route path={ROUTES.loans} element={<ProductPage product="loans" />} />
      <Route path={ROUTES.investments} element={<ProductPage product="investments" />} />

      {/* Every dashboard route sits behind the active-account gate. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.dashboard} element={<Dashboard />} />
          <Route path={ROUTES.dashboardTransactions} element={<Transactions />} />
          <Route path={ROUTES.dashboardBeneficiaries} element={<Beneficiaries />} />
          <Route path={ROUTES.dashboardProfile} element={<Profile />} />
          <Route path={ROUTES.dashboardInvestments} element={<Investments />} />
          <Route path={ROUTES.dashboardLoans} element={<Loans />} />
          <Route path={ROUTES.dashboardCards} element={<Cards />} />
          <Route path={ROUTES.dashboardSupport} element={<Support />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
