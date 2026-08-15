const crypto = require("crypto");

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function generateReference() {
  return `TXN${Date.now().toString().slice(-8)}${crypto.randomInt(100000, 1000000)}`;
}

function publicTransaction(transaction) {
  return {
    id: transaction._id,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    balanceAfter: transaction.balanceAfter,
    reference: transaction.reference,
    description: transaction.description ?? null,
    status: transaction.status,
    dateTime: transaction.dateTime,
    senderAccountNumber: transaction.senderAccountNumber,
    receiverAccountNumber: transaction.receiverAccountNumber,
  };
}

module.exports = {
  roundMoney,
  generateReference,
  publicTransaction,
};
