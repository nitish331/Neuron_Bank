import { FileText, House, Percent, UserCheck, Users } from 'lucide-react';
import { ROUTES } from '../routes/paths';

/** Only destinations with a real screen — no links to nowhere. */
export const ADMIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', to: ROUTES.dashboard, icon: House, end: true },
  {
    id: 'approvals',
    label: 'Account Approvals',
    to: ROUTES.approvals,
    icon: UserCheck,
    // Filled from the live pending count.
    badge: 'pending',
  },
  {
    id: 'loans',
    label: 'Loan Requests',
    to: ROUTES.loanApprovals,
    icon: FileText,
    badge: 'pending',
    source: 'loans',
  },
  {
    id: 'customers',
    label: 'Customers',
    to: ROUTES.customers,
    icon: Users,
  },
  {
    id: 'rates',
    label: 'Interest Rates',
    to: ROUTES.interestRates,
    icon: Percent,
  },
];
