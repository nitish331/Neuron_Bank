const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const EmailVerification = require("../models/emailVerification");
const { sendPasswordResetEmail } = require("../utils/mailer");
const { hashToken } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");
const {
  PASSWORD_RESET_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");

// Same answer whether or not the address exists, so this cannot be used to
// discover who banks here.
const GENERIC_RESPONSE = {
  success: true,
  message: "If that email is registered, a reset link is on its way",
};

function buildResetUrl(token) {
  const configured =
    process.env.CLIENT_APP_URL ||
    (process.env.CLIENT_ORIGINS || "http://localhost:3001").split(",")[0];

  return `${configured.trim().replace(/\/$/, "")}/reset-password?token=${token}`;
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select("_id name email").lean();

    if (!user) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    // 32 random bytes, so the link cannot be guessed and needs no attempt limit.
    const token = crypto.randomBytes(32).toString("hex");

    // One record per address, so asking again replaces any earlier link.
    await EmailVerification.findOneAndUpdate(
      { email: user.email, purpose: "reset" },
      {
        email: user.email,
        purpose: "reset",
        codeHash: hashToken(token),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(PASSWORD_RESET_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendPasswordResetEmail(
      user.email,
      user.name,
      buildResetUrl(token),
      PASSWORD_RESET_EXPIRES_IN_MINUTES,
    );

    return res.status(200).json(GENERIC_RESPONSE);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    // The stored hash is deterministic, so the token itself finds the record.
    const reset = await EmailVerification.findOne({
      purpose: "reset",
      codeHash: hashToken(token),
    });

    // MongoDB removes expired records on a delay, so check the time as well.
    if (!reset || reset.expiresAt <= new Date()) {
      throw createHttpError(
        400,
        "This reset link is invalid or has expired. Please request a new one",
      );
    }

    const user = await User.findOne({ email: reset.email }).select(
      "+passwordHash +refreshTokenHash +refreshTokenExpiresAt",
    );

    if (!user) {
      await reset.deleteOne();
      throw createHttpError(
        400,
        "This reset link is invalid or has expired. Please request a new one",
      );
    }

    const saltRounds = Number.parseInt(
      process.env.BCRYPT_SALT_ROUNDS || "12",
      10,
    );

    user.passwordHash = await bcrypt.hash(password, saltRounds);
    // Whoever knew the old password is signed out everywhere.
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();

    // Used up, so the same link cannot set a second password.
    await reset.deleteOne();

    return res.status(200).json({
      success: true,
      message: "password reset successfully. Please log in with your new password",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { forgotPassword, resetPassword };
