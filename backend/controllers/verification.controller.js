const User = require("../models/user");
const EmailVerification = require("../models/emailVerification");
const generateVerificationCode = require("../utils/generateVerificationCode");
const { sendRegistrationCodeEmail } = require("../utils/mailer");
const { hashToken, tokenHashMatches } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  VERIFIED_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");

async function sendVerificationCode(req, res, next) {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email }).select("_id").lean();

    if (existingUser) {
      throw createHttpError(409, "An account with this email already exists");
    }

    const code = generateVerificationCode();

    // One record per email, so asking for a new code replaces the old one.
    await EmailVerification.findOneAndUpdate(
      { email, purpose: "register" },
      {
        email,
        purpose: "register",
        codeHash: hashToken(code),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(CODE_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendRegistrationCodeEmail(email, code, CODE_EXPIRES_IN_MINUTES);

    return res.status(200).json({
      success: true,
      message: "verification code sent to your email",
      data: {
        email,
        expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmailCode(req, res, next) {
  try {
    const { email, code } = req.body;

    const verification = await EmailVerification.findOne({
      email,
      purpose: "register",
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

    if (!tokenHashMatches(code, verification.codeHash)) {
      verification.attempts += 1;
      await verification.save();
      throw createHttpError(
        400,
        "The code is invalid or has expired. Please request a new one",
      );
    }

    verification.verified = true;
    verification.attempts = 0;
    verification.expiresAt = minutesFromNow(VERIFIED_EXPIRES_IN_MINUTES);
    await verification.save();

    return res.status(200).json({
      success: true,
      message: "email verified successfully",
      data: {
        email,
        verified: true,
        expiresInMinutes: VERIFIED_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendVerificationCode, verifyEmailCode };
