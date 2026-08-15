const mongoose = require("mongoose");
const Account = require("../models/account");
const User = require("../models/user");
const { createHttpError } = require("../utils/authUtils");

async function approveAccount(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const { accountId } = req.params;
    let approvedAccount;
    let owner;

    await session.withTransaction(async () => {
      const account = await Account.findById(accountId).session(session);

      if (!account) {
        throw createHttpError(404, "Account not found");
      }

      if (account.status !== "pending") {
        throw createHttpError(
          409,
          `Account is already ${account.status} and cannot be approved`,
        );
      }

      owner = await User.findById(account.user).session(session);

      if (!owner) {
        throw createHttpError(404, "The owner of this account no longer exists");
      }

      if (owner.status === "suspended" || owner.status === "rejected") {
        throw createHttpError(
          422,
          `Cannot approve an account whose owner is ${owner.status}`,
        );
      }

      account.status = "active";
      account.approvedBy = req.user._id;
      account.approvedAt = new Date();
      account.rejectionReason = undefined;
      approvedAccount = await account.save({ session });

      if (owner.status === "pending") {
        owner.status = "active";
        await owner.save({ session });
      }
    });

    return res.status(200).json({
      success: true,
      message: "account approved successfully",
      data: {
        id: approvedAccount._id,
        accountNumber: approvedAccount.accountNumber,
        status: approvedAccount.status,
        balance: approvedAccount.balance,
        currency: approvedAccount.currency,
        approvedBy: approvedAccount.approvedBy,
        approvedAt: approvedAccount.approvedAt,
        ownerName: owner.name,
        ownerEmail: owner.email,
        ownerStatus: owner.status,
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

module.exports = { approveAccount };
