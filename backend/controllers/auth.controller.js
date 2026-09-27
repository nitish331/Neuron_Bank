const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user");
const Account = require("../models/account");
const EmailVerification = require("../models/emailVerification");
const generateAccountNumber = require("../utils/generateAccountNumber");
const generateVerificationCode = require("../utils/generateVerificationCode");
const {
  sendLoginCodeEmail,
  sendAccountPendingEmail,
  sendLoginAlertEmail,
} = require("../utils/mailer");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");
const {
  createAccessToken,
  createTokenPair,
  getRefreshToken,
  hashToken,
  tokenHashMatches,
  verifyRefreshToken,
} = require("../utils/jwt.utils");

const {
  createHttpError,
  publicRegistrationUser,
  publicLoginData,
} = require("../utils/authUtils");

async function register(req, res, next) {
  let session;

  try {
    session = await mongoose.startSession();
    const { name, email, phoneNumber, dateOfBirth, password } = req.body;
    const saltRounds = Number.parseInt(
      process.env.BCRYPT_SALT_ROUNDS || "12",
      10,
    );
    const passwordHash = await bcrypt.hash(password, saltRounds);
    let createdUser;
    let tokenPair;

    await session.withTransaction(async () => {
      const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }],
      })
        .select("_id email phoneNumber")
        .session(session);

      if (existingUser) {
        throw createHttpError(
          409,
          existingUser.email === email
            ? "An account with this email already exists"
            : "An account with this phone number already exists",
        );
      }

      const verification = await EmailVerification.findOne({
        email,
        purpose: "register",
      }).session(session);

      if (
        !verification ||
        !verification.verified ||
        verification.expiresAt <= new Date()
      ) {
        throw createHttpError(
          403,
          "Please verify your email before creating an account",
        );
      }

      [createdUser] = await User.create(
        [
          {
            name,
            email,
            phoneNumber,
            dateOfBirth,
            passwordHash,
            role: "customer",
            status: "pending",
            emailVerifiedAt: verification.updatedAt,
          },
        ],
        { session },
      );

      await Account.create(
        [
          {
            user: createdUser._id,
            accountNumber: generateAccountNumber(),
            status: "pending",
          },
        ],
        { session },
      );

      // Used up, so it cannot back a second registration.
      await EmailVerification.deleteOne({ _id: verification._id }, { session });

      tokenPair = createTokenPair(createdUser);
      createdUser.refreshTokenHash = hashToken(tokenPair.refreshToken);
      createdUser.refreshTokenExpiresAt = tokenPair.refreshTokenExpiresAt;
      await createdUser.save({ session });
    });

    // The account is already committed, so a mail failure must not fail the request.
    try {
      await sendAccountPendingEmail(createdUser.email, createdUser.name);
    } catch (error) {
      console.error("Account request email failed:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: "account request successfully created",
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      data: publicRegistrationUser(createdUser),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw createHttpError(401, "Invalid email or password");
    }

    // The password was correct, so the code becomes the second factor.
    const code = generateVerificationCode();

    await EmailVerification.findOneAndUpdate(
      { email, purpose: "login" },
      {
        email,
        purpose: "login",
        codeHash: hashToken(code),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(CODE_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendLoginCodeEmail(email, code, CODE_EXPIRES_IN_MINUTES);

    return res.status(200).json({
      success: true,
      message: "login code sent to your email",
      data: {
        email,
        verificationRequired: true,
        expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyLoginCode(req, res, next) {
  try {
    const { email, code } = req.body;

    const verification = await EmailVerification.findOne({
      email,
      purpose: "login",
    });

    // MongoDB removes expired records on a delay, so check the time as well.
    const isUsable = verification && verification.expiresAt > new Date();

    if (!isUsable) {
      throw createHttpError(
        400,
        "The code is invalid or has expired. Please log in again",
      );
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await verification.deleteOne();
      throw createHttpError(
        429,
        "Too many incorrect attempts. Please log in again to get a new code",
      );
    }

    if (!tokenHashMatches(code, verification.codeHash)) {
      verification.attempts += 1;
      await verification.save();
      throw createHttpError(
        400,
        "The code is invalid or has expired. Please log in again",
      );
    }

    const user = await User.findOne({ email }).select(
      "+refreshTokenHash +refreshTokenExpiresAt",
    );

    if (!user) {
      throw createHttpError(401, "Invalid email or password");
    }

    // Used up, so the same code cannot start a second session.
    await verification.deleteOne();

    const account = await Account.findOne({ user: user._id }).lean();
    const tokenPair = createTokenPair(user);

    user.refreshTokenHash = hashToken(tokenPair.refreshToken);
    user.refreshTokenExpiresAt = tokenPair.refreshTokenExpiresAt;
    await user.save();

    // The session is already issued, so a mail failure must not fail the login.
    try {
      await sendLoginAlertEmail(user.email, user.name);
    } catch (error) {
      console.error("Login alert email failed:", error.message);
    }

    return res.status(200).json({
      success: true,
      message: "login successful",
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      data: publicLoginData(user, account),
    });
  } catch (error) {
    return next(error);
  }
}

async function refreshAccessToken(req, res, next) {
  try {
    const refreshToken = getRefreshToken(req);
    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw createHttpError(
        401,
        "Refresh token is invalid or expired. Please login again",
      );
    }

    const user = await User.findById(payload.userId).select(
      "+refreshTokenHash +refreshTokenExpiresAt",
    );

    const tokenMatches =
      user?.refreshTokenHash &&
      user.refreshTokenExpiresAt > new Date() &&
      tokenHashMatches(refreshToken, user.refreshTokenHash);

    if (!tokenMatches) {
      throw createHttpError(
        401,
        "Refresh token is invalid or expired. Please login again",
      );
    }

    return res.status(200).json({
      success: true,
      message: "access token refreshed successfully",
      token: createAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = getRefreshToken(req);
    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      // An unusable token has nothing left to revoke, so the client is already logged out.
      return res.status(200).json({
        success: true,
        message: "logged out successfully",
      });
    }

    const user = await User.findById(payload.userId).select(
      "+refreshTokenHash +refreshTokenExpiresAt",
    );

    // Only the session this token belongs to, so a stale token cannot end a newer one.
    if (
      user?.refreshTokenHash &&
      tokenHashMatches(refreshToken, user.refreshTokenHash)
    ) {
      user.refreshTokenHash = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  verifyLoginCode,
  refreshAccessToken,
  logout,
};
