const crypto = require("crypto");

// Dummy card details, not issued by any real network.
const CARD_BIN = "607451";
const CARD_LENGTH = 16;
const VALID_FOR_YEARS = 5;

function generateCardNumber() {
  let number = CARD_BIN;

  while (number.length < CARD_LENGTH) {
    number += crypto.randomInt(0, 10);
  }

  return number;
}

function generateCardDetails(issuedAt = new Date()) {
  const number = generateCardNumber();
  const expiryMonth = issuedAt.getMonth() + 1;
  const expiryYear = issuedAt.getFullYear() + VALID_FOR_YEARS;

  return {
    number,
    last4: number.slice(-4),
    cvv: String(crypto.randomInt(0, 1000)).padStart(3, "0"),
    expiryMonth,
    expiryYear,
    // The last moment of the expiry month, the way a printed card behaves.
    expiresAt: new Date(Date.UTC(expiryYear, expiryMonth, 1) - 1),
  };
}

module.exports = generateCardDetails;
