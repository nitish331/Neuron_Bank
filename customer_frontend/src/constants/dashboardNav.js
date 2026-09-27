import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  CircleQuestionMark,
  CreditCard,
  FileText,
  House,
  User,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '../routes/paths';

/** Sidebar destinations, in display order. */
export const DASHBOARD_NAV = [
  { id: 'dashboard', label: 'Dashboard', to: ROUTES.dashboard, icon: House, end: true },
  { id: 'accounts', label: 'Accounts', to: ROUTES.dashboardAccounts, icon: Wallet },
  { id: 'transactions', label: 'Transactions', to: ROUTES.dashboardTransactions, icon: ArrowLeftRight },
  { id: 'investments', label: 'Investments', to: ROUTES.dashboardInvestments, icon: ChartNoAxesColumn },
  { id: 'loans', label: 'Loans', to: ROUTES.dashboardLoans, icon: FileText },
  { id: 'cards', label: 'Debit Cards', to: ROUTES.dashboardCards, icon: CreditCard },
  { id: 'profile', label: 'Profile', to: ROUTES.dashboardProfile, icon: User },
  { id: 'support', label: 'Help & Support', to: ROUTES.dashboardSupport, icon: CircleQuestionMark },
];
