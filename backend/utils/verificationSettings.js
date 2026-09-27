// Shared by the signup and login code flows so the two cannot drift apart.
const MAX_ATTEMPTS = 5;
const CODE_EXPIRES_IN_MINUTES = 10;
const VERIFIED_EXPIRES_IN_MINUTES = 30;
const PASSWORD_RESET_EXPIRES_IN_MINUTES = 30;

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  VERIFIED_EXPIRES_IN_MINUTES,
  PASSWORD_RESET_EXPIRES_IN_MINUTES,
  minutesFromNow,
};
