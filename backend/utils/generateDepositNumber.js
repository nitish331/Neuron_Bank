const crypto = require("crypto");

// FD for a fixed deposit, RD for a recurring one.
function generateDepositNumber(prefix = "FD") {
  const timestamp = Date.now().toString().slice(-8);
  const randomPart = crypto.randomInt(100000, 1000000);

  return `${prefix}${timestamp}${randomPart}`;
}

module.exports = generateDepositNumber;
