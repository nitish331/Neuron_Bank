/**
 * Every route the customer app knows about.
 *
 * Import from here instead of writing path strings inline, so a rename is a
 * one-line change. Routes marked "not built yet" resolve to the NotFound page
 * until their screen exists.
 */
export const ROUTES = {
  home: '/',

  // Marketing
  accounts: '/accounts',
  cards: '/cards',
  loans: '/loans',
  investments: '/investments',
  support: '/support',

  // Auth
  login: '/login',
  register: '/register',
  // The emailed reset link points here, so the path must stay stable.
  resetPassword: '/reset-password',
  setCardPin: '/set-card-pin',

  // Authenticated app. Namespaced so they cannot collide with the marketing
  // routes above, which already own /loans and /cards.
  dashboard: '/dashboard',
  dashboardAccounts: '/dashboard/accounts',
  dashboardTransactions: '/dashboard/transactions',
  dashboardInvestments: '/dashboard/investments',
  dashboardLoans: '/dashboard/loans',
  dashboardCards: '/dashboard/cards',
  dashboardProfile: '/dashboard/profile',
  dashboardSupport: '/dashboard/support',
};
