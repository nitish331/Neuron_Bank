const crypto = require("crypto");

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

module.exports = generateVerificationCode;
