const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user");
const Account = require("../models/account");
const generateAccountNumber = require("../utils/generateAccountNumber");
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

      tokenPair = createTokenPair(createdUser);
      createdUser.refreshTokenHash = hashToken(tokenPair.refreshToken);
      createdUser.refreshTokenExpiresAt = tokenPair.refreshTokenExpiresAt;
      await createdUser.save({ session });
    });

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
    const user = await User.findOne({ email }).select(
      "+passwordHash +refreshTokenHash +refreshTokenExpiresAt",
    );

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw createHttpError(401, "Invalid email or password");
    }

    const account = await Account.findOne({ user: user._id }).lean();
    const tokenPair = createTokenPair(user);

    user.refreshTokenHash = hashToken(tokenPair.refreshToken);
    user.refreshTokenExpiresAt = tokenPair.refreshTokenExpiresAt;
    await user.save();

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

module.exports = {
  register,
  login,
  refreshAccessToken,
};
