/**
 * Why the dashboard is off limits, or null when the account is usable.
 * `tone` separates a routine wait from a decision that has gone against them.
 */
export function accessState(user) {
  // A `= {}` default would not help: a stored session can be null.
  const { status, accountStatus } = user || {};

  if (status === 'rejected' || accountStatus === 'rejected') {
    return {
      tone: 'stopped',
      title: 'Application not approved',
      message:
        'Your application was not approved. Contact support if you think this is a mistake.',
    };
  }
  if (status === 'suspended') {
    return {
      tone: 'stopped',
      title: 'Account suspended',
      message: 'Your account is suspended. Contact support to restore access.',
    };
  }
  if (accountStatus === 'closed') {
    return {
      tone: 'stopped',
      title: 'Account closed',
      message: 'This account has been closed and can no longer be used.',
    };
  }
  if (status !== 'active' || accountStatus !== 'active') {
    return {
      tone: 'pending',
      title: 'Approval in progress',
      message:
        'Your account is with our team for review. We will email you as soon as it is approved — usually within one business day.',
    };
  }
  return null;
}

/** Both the user and their account must be active. */
export function canAccessDashboard(user) {
  return accessState(user) === null;
}
