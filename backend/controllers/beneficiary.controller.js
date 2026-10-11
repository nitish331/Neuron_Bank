const Account = require("../models/account");
const User = require("../models/user");
const Beneficiary = require("../models/beneficiary");
const EmailVerification = require("../models/emailVerification");
const generateVerificationCode = require("../utils/generateVerificationCode");
const { sendBeneficiaryCodeEmail } = require("../utils/mailer");
const { hashToken, tokenHashMatches } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");

// An account in either state can never receive money, so it cannot be saved.
const UNUSABLE_ACCOUNT_STATUSES = ["rejected", "closed"];

// Same answer for a wrong number and a wrong name, so this cannot be used to
// discover which account numbers exist or who owns them.
const NO_MATCH =
  "No Neuron Bank account matches that number and account holder name";

function publicBeneficiary(beneficiary) {
  return {
    id: beneficiary._id,
    name: beneficiary.name,
    accountNumber: beneficiary.accountNumber,
    status: beneficiary.status,
    createdAt: beneficiary.createdAt,
  };
}

// Ignores case and stray spacing, so "  nitish  kathuria " matches the record.
function normaliseName(value) {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

async function findOwnBeneficiary(beneficiaryId, userId) {
  const beneficiary = await Beneficiary.findOne({
    _id: beneficiaryId,
    user: userId,
  });

  if (!beneficiary) {
    throw createHttpError(404, "Beneficiary not found");
  }

  return beneficiary;
}

async function addBeneficiary(req, res, next) {
  try {
    const { accountNumber, name } = req.body;

    const account = await Account.findOne({ accountNumber }).lean();

    if (!account || UNUSABLE_ACCOUNT_STATUSES.includes(account.status)) {
      throw createHttpError(404, NO_MATCH);
    }

    const owner = await User.findById(account.user).select("name").lean();

    if (!owner || normaliseName(owner.name) !== normaliseName(name)) {
      throw createHttpError(404, NO_MATCH);
    }

    if (String(account.user) === String(req.user._id)) {
      throw createHttpError(
        400,
        "This is your own account, so it cannot be added as a beneficiary",
      );
    }

    const existing = await Beneficiary.findOne({
      user: req.user._id,
      account: account._id,
    }).lean();

    if (existing) {
      throw createHttpError(
        409,
        `${existing.name} is already saved as a beneficiary`,
      );
    }

    const beneficiary = await Beneficiary.create({
      user: req.user._id,
      account: account._id,
      accountNumber: account.accountNumber,
      // The verified holder name, not whatever casing was typed in.
      name: owner.name,
    });

    return res.status(201).json({
      success: true,
      message: "beneficiary added successfully",
      data: { beneficiary: publicBeneficiary(beneficiary) },
    });
  } catch (error) {
    return next(error);
  }
}

async function listBeneficiaries(req, res, next) {
  try {
    const beneficiaries = await Beneficiary.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "beneficiaries fetched successfully",
      data: {
        beneficiaries: beneficiaries.map(publicBeneficiary),
        total: beneficiaries.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function sendBeneficiaryCode(req, res, next) {
  try {
    const action = req.body.action || "update";
    const beneficiary = await findOwnBeneficiary(
      req.params.beneficiaryId,
      req.user._id,
    );

    const code = generateVerificationCode();

    // One record per address, so asking for a new code replaces the old one.
    await EmailVerification.findOneAndUpdate(
      { email: req.user.email, purpose: "beneficiary" },
      {
        email: req.user.email,
        purpose: "beneficiary",
        // Tied to the payee and the action, so a code cannot be spent elsewhere.
        codeHash: hashToken(`${beneficiary._id}:${action}:${code}`),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(CODE_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendBeneficiaryCodeEmail({
      email: req.user.email,
      name: req.user.name,
      beneficiaryName: beneficiary.name,
      accountNumber: beneficiary.accountNumber,
      action: action === "delete" ? "remove" : "change",
      code,
      expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
    });

    return res.status(200).json({
      success: true,
      message: "confirmation code sent to your email",
      data: {
        beneficiaryId: beneficiary._id,
        action,
        expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// Shared by the update and delete routes, so one wrong code counts once.
async function consumeCode(email, beneficiaryId, action, code) {
  const verification = await EmailVerification.findOne({
    email,
    purpose: "beneficiary",
  });

  // MongoDB removes expired records on a delay, so check the time as well.
  const isUsable = verification && verification.expiresAt > new Date();

  if (!isUsable) {
    throw createHttpError(
      400,
      "The code is invalid or has expired. Please request a new one",
    );
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    await verification.deleteOne();
    throw createHttpError(
      429,
      "Too many incorrect attempts. Please request a new code",
    );
  }

  if (!tokenHashMatches(`${beneficiaryId}:${action}:${code}`, verification.codeHash)) {
    verification.attempts += 1;
    await verification.save();
    throw createHttpError(
      400,
      "The code is invalid or has expired. Please request a new one",
    );
  }

  // Used up, so the same code cannot authorise a second change.
  await verification.deleteOne();
}

async function updateBeneficiary(req, res, next) {
  try {
    const { code, status } = req.body;
    const beneficiary = await findOwnBeneficiary(
      req.params.beneficiaryId,
      req.user._id,
    );

    if (beneficiary.status === status) {
      throw createHttpError(409, `This beneficiary is already ${status}`);
    }

    await consumeCode(req.user.email, beneficiary._id, "update", code);

    beneficiary.status = status;
    await beneficiary.save();

    return res.status(200).json({
      success: true,
      message: `beneficiary ${status === "disabled" ? "disabled" : "enabled"} successfully`,
      data: { beneficiary: publicBeneficiary(beneficiary) },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteBeneficiary(req, res, next) {
  try {
    const beneficiary = await findOwnBeneficiary(
      req.params.beneficiaryId,
      req.user._id,
    );

    await consumeCode(req.user.email, beneficiary._id, "delete", req.body.code);

    await beneficiary.deleteOne();

    return res.status(200).json({
      success: true,
      message: "beneficiary removed successfully",
      data: { id: beneficiary._id, name: beneficiary.name },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addBeneficiary,
  listBeneficiaries,
  sendBeneficiaryCode,
  updateBeneficiary,
  deleteBeneficiary,
};
