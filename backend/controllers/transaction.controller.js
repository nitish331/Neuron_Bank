const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const Transaction = require("../models/transaction");
const { createHttpError } = require("../utils/authUtils");
const {
  roundMoney,
  generateReference,
  publicTransaction,
} = require("../utils/transactionUtils");

async function transfer(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const { receiverAccountNumber, description } = req.body;
    const amount = roundMoney(req.body.amount);
    let debitTransaction;
    let senderBalance;

    await session.withTransaction(async () => {
      const senderAccount = await Account.findOne({ user: req.user._id })
        .session(session);

      if (!senderAccount) {
        throw createHttpError(404, "No account found for the logged in user");
      }

      const receiverAccount = await Account.findOne({
        accountNumber: receiverAccountNumber,
      }).session(session);

      if (!receiverAccount) {
        throw createHttpError(
          404,
          "No account found for the provided receiver account number",
        );
      }

      if (senderAccount._id.equals(receiverAccount._id)) {
        throw createHttpError(400, "You cannot transfer money to yourself");
      }

      if (senderAccount.status !== "active") {
        throw createHttpError(
          403,
          `Your account is ${senderAccount.status} and cannot send money`,
        );
      }

      if (receiverAccount.status !== "active") {
        throw createHttpError(
          422,
          "The receiver account is not active and cannot accept money",
        );
      }

      if (senderAccount.currency !== receiverAccount.currency) {
        throw createHttpError(
          422,
          "Transfers between accounts of different currencies are not supported",
        );
      }

      const receiverUser = await User.findById(receiverAccount.user)
        .select("_id status")
        .session(session);

      if (!receiverUser) {
        throw createHttpError(404, "The receiver account owner no longer exists");
      }

      if (receiverUser.status === "suspended" || receiverUser.status === "rejected") {
        throw createHttpError(
          422,
          "The receiver account is not able to accept money right now",
        );
      }

      if (senderAccount.balance < amount) {
        throw createHttpError(
          400,
          "Insufficient balance to complete this transfer",
        );
      }

      const debitedAccount = await Account.findOneAndUpdate(
        { _id: senderAccount._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session },
      );

      if (!debitedAccount) {
        throw createHttpError(
          409,
          "Insufficient balance to complete this transfer",
        );
      }

      const creditedAccount = await Account.findOneAndUpdate(
        { _id: receiverAccount._id },
        { $inc: { balance: amount } },
        { new: true, session },
      );

      const shared = {
        sender: req.user._id,
        receiver: receiverUser._id,
        senderAccountNumber: senderAccount.accountNumber,
        receiverAccountNumber: receiverAccount.accountNumber,
        amount,
        currency: senderAccount.currency,
        reference: generateReference(),
        description,
        dateTime: new Date(),
      };

      const [debitRow] = await Transaction.create(
        [
          {
            ...shared,
            account: senderAccount._id,
            type: "debit",
            balanceAfter: roundMoney(debitedAccount.balance),
          },
          {
            ...shared,
            account: receiverAccount._id,
            type: "credit",
            balanceAfter: roundMoney(creditedAccount.balance),
          },
        ],
        { session, ordered: true },
      );

      debitTransaction = debitRow;
      senderBalance = roundMoney(debitedAccount.balance);
    });

    return res.status(201).json({
      success: true,
      message: "transfer completed successfully",
      data: {
        balance: senderBalance,
        transaction: publicTransaction(debitTransaction),
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function deposit(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const { description } = req.body;
    const amount = roundMoney(req.body.amount);
    let creditTransaction;
    let updatedBalance;

    await session.withTransaction(async () => {
      const account = await Account.findOne({ user: req.user._id }).session(
        session,
      );

      if (!account) {
        throw createHttpError(404, "No account found for the logged in user");
      }

      if (account.status !== "active") {
        throw createHttpError(
          403,
          `Your account is ${account.status} and cannot receive money`,
        );
      }

      const creditedAccount = await Account.findOneAndUpdate(
        { _id: account._id },
        { $inc: { balance: amount } },
        { new: true, session },
      );

      const [creditRow] = await Transaction.create(
        [
          {
            account: account._id,
            sender: req.user._id,
            receiver: req.user._id,
            senderAccountNumber: account.accountNumber,
            receiverAccountNumber: account.accountNumber,
            type: "credit",
            amount,
            currency: account.currency,
            balanceAfter: roundMoney(creditedAccount.balance),
            reference: generateReference(),
            description,
            dateTime: new Date(),
          },
        ],
        { session },
      );

      creditTransaction = creditRow;
      updatedBalance = roundMoney(creditedAccount.balance);
    });

    return res.status(201).json({
      success: true,
      message: "money added successfully",
      data: {
        balance: updatedBalance,
        transaction: publicTransaction(creditTransaction),
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

module.exports = { transfer, deposit };
