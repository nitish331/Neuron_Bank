const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function requireEnvironment(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function safePayload(user, tokenType) {
  return {
    userId: user._id.toString(),
    role: user.role,
    tokenType,
  };
}

function createAccessToken(user) {
  return jwt.sign(
    safePayload(user, "access"),
    requireEnvironment("JWT_ACCESS_SECRET"),
    {
      expiresIn: requireEnvironment("JWT_ACCESS_EXPIRES_IN"),
    }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    safePayload(user, "refresh"),
    requireEnvironment("JWT_REFRESH_SECRET"),
    {
      expiresIn: requireEnvironment("JWT_REFRESH_EXPIRES_IN"),
      jwtid: crypto.randomUUID(),
    }
  );
}

function createTokenPair(user) {
  const refreshToken = createRefreshToken(user);
  const decodedRefreshToken = jwt.decode(refreshToken);

  return {
    accessToken: createAccessToken(user),
    refreshToken,
    refreshTokenExpiresAt: new Date(decodedRefreshToken.exp * 1000),
  };
}

function verifyAccessToken(accessToken) {
  const payload = jwt.verify(
    accessToken,
    requireEnvironment("JWT_ACCESS_SECRET")
  );

  if (payload.tokenType !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
}

function verifyRefreshToken(refreshToken) {
  const payload = jwt.verify(
    refreshToken,
    requireEnvironment("JWT_REFRESH_SECRET")
  );

  if (payload.tokenType !== "refresh") {
    throw new Error("Invalid token type");
  }

  return payload;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function tokenHashMatches(token, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }

  const receivedHashBuffer = Buffer.from(hashToken(token), "hex");
  const storedHashBuffer = Buffer.from(storedHash, "hex");

  return (
    receivedHashBuffer.length === storedHashBuffer.length &&
    crypto.timingSafeEqual(receivedHashBuffer, storedHashBuffer)
  );
}

function getBearerToken(req) {
  const authorization = req.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);

  return bearerMatch ? bearerMatch[1].trim() : null;
}

function getRefreshToken(req) {
  if (
    typeof req.body?.refreshToken === "string" &&
    req.body.refreshToken.trim()
  ) {
    return req.body.refreshToken.trim();
  }

  return getBearerToken(req);
}

module.exports = {
  createAccessToken,
  createTokenPair,
  getBearerToken,
  getRefreshToken,
  hashToken,
  tokenHashMatches,
  verifyAccessToken,
  verifyRefreshToken,
};
