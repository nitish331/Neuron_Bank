const crypto = require("crypto");

// GCM authenticates as well as encrypts, so tampering is detected on read.
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getKey() {
  const raw = process.env.CARD_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("CARD_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(raw.trim(), "hex");

  if (key.length !== 32) {
    throw new Error("CARD_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }

  return key;
}

/** Reversible, unlike hashToken — the card number has to be readable again. */
function encryptSecret(value) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/** Null for anything missing, tampered with, or written before encryption. */
function decryptSecret(payload) {
  if (!payload) {
    return null;
  }

  const [ivHex, tagHex, dataHex] = String(payload).split(":");

  if (!ivHex || !tagHex || !dataHex) {
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));

    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

module.exports = { encryptSecret, decryptSecret };
