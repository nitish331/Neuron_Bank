const User = require("../models/user");
const { getBearerToken, verifyAccessToken } = require("../utils/jwt.utils");
const { createHttpError } = require("../utils/authUtils");

const BLOCKED_USER_STATUSES = ["suspended", "rejected"];

async function authenticate(req, res, next) {
  try {
    const accessToken = getBearerToken(req);

    if (!accessToken) {
      throw createHttpError(
        401,
        "Authentication required. Provide a Bearer access token"
      );
    }

    let payload;

    try {
      payload = verifyAccessToken(accessToken);
    } catch (error) {
      throw createHttpError(401, "Access token is invalid or expired");
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      throw createHttpError(401, "Access token is invalid or expired");
    }

    if (BLOCKED_USER_STATUSES.includes(user.status)) {
      throw createHttpError(403, `Your account is ${user.status}`);
    }

    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRole(...roles) {
  return function authorize(req, res, next) {
    if (!req.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        createHttpError(403, "You do not have permission to perform this action")
      );
    }

    return next();
  };
}

module.exports = { authenticate, requireRole };
