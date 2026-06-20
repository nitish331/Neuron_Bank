const crypto = require("crypto");

function generateAccountNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const randomPart = crypto.randomInt(100000, 1000000);

  return `SAV${timestamp}${randomPart}`;
}

module.exports = generateAccountNumber;
