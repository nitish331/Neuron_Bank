const crypto = require("crypto");
const Account = require("../models/account");
const User = require("../models/user");
const DebitCard = require("../models/debitCard");
const EmailVerification = require("../models/emailVerification");
const generateCardDetails = require("../utils/generateCardDetails");
const generateVerificationCode = require("../utils/generateVerificationCode");
const {
  sendCardSettingsCodeEmail,
  sendCardPinResetEmail,
} = require("../utils/mailer");
const { hashToken, tokenHashMatches } = require("../utils/jwt.utils");
const { encryptSecret, decryptSecret } = require("../utils/cardCrypto");
const { createHttpError } = require("../utils/authUtils");
const {
  MAX_ATTEMPTS,
  CODE_EXPIRES_IN_MINUTES,
  PASSWORD_RESET_EXPIRES_IN_MINUTES,
  minutesFromNow,
} = require("../utils/verificationSettings");

// A card in either state is still the customer's card, so it blocks a new one.
const BLOCKING_STATUSES = ["active", "frozen"];

// Expiry is final. A block can still be lifted, so the two are not the same.
const LOCKED_STATUSES = ["blocked", "expired"];

// Guards the one card in use rule when a status change would put a card back
// into service, whether that is unblocking it or thawing a frozen one.
async function assertNoCardInUse(userId, cardId) {
  const inUse = await DebitCard.findOne({
    user: userId,
    _id: { $ne: cardId },
    status: { $in: BLOCKING_STATUSES },
  });

  if (inUse) {
    throw createHttpError(
      409,
      `Your card ending ${inUse.last4} is already ${inUse.status}. Only one card can be in use at a time`,
    );
  }
}

function publicCard(card) {
  return {
    id: card._id,
    last4: card.last4,
    cardholderName: card.cardholderName,
    network: card.network,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    expiresAt: card.expiresAt,
    status: card.status,
    dailyLimit: card.dailyLimit,
    currency: card.currency,
    issuedAt: card.issuedAt,
    pinSet: Boolean(card.pinSetAt),
    pinSetAt: card.pinSetAt ?? null,
  };
}

// Expiry is settled when it is needed, so no scheduled job has to sweep cards.
function retireIfExpired(card, now) {
  if (!LOCKED_STATUSES.includes(card.status) && card.expiresAt <= now) {
    card.status = "expired";
    return true;
  }

  return false;
}

async function findOwnCard(cardId, userId) {
  const card = await DebitCard.findOne({ _id: cardId, user: userId });

  if (!card) {
    throw createHttpError(404, "Debit card not found");
  }

  return card;
}

async function requestDebitCard(req, res, next) {
  try {
    const account = await Account.findOne({ user: req.user._id });

    if (!account) {
      throw createHttpError(404, "No account found for the logged in user");
    }

    if (account.status !== "active") {
      throw createHttpError(
        403,
        `Your account is ${account.status} and cannot be issued a debit card`,
      );
    }

    const now = new Date();

    const currentCard = await DebitCard.findOne({
      user: req.user._id,
      status: { $in: BLOCKING_STATUSES },
    });

    if (currentCard) {
      if (currentCard.expiresAt > now) {
        throw createHttpError(
          409,
          `You already have a debit card ending ${currentCard.last4} (${currentCard.status})`,
        );
      }

      // Past its expiry date but never marked, so retire it and issue the next one.
      currentCard.status = "expired";
      await currentCard.save();
    }

    const details = generateCardDetails(now);

    const card = await DebitCard.create({
      user: req.user._id,
      account: account._id,
      last4: details.last4,
      cardNumberEnc: encryptSecret(details.number),
      cvvEnc: encryptSecret(details.cvv),
      cardholderName: req.user.name,
      expiryMonth: details.expiryMonth,
      expiryYear: details.expiryYear,
      expiresAt: details.expiresAt,
      currency: account.currency,
      issuedAt: now,
    });

    return res.status(201).json({
      success: true,
      message: "debit card issued successfully",
      data: {
        card: publicCard(card),
        accountNumber: account.accountNumber,
        // Shown once, never stored in a readable form and never returned again.
        secrets: {
          cardNumber: details.number,
          cvv: details.cvv,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function sendCardSettingsCode(req, res, next) {
  try {
    const card = await findOwnCard(req.params.cardId, req.user._id);

    if (retireIfExpired(card, new Date())) {
      await card.save();
    }

    // Blocked is allowed through, because lifting a block needs a code too.
    if (card.status === "expired") {
      throw createHttpError(
        409,
        "This card has expired and its settings cannot be changed",
      );
    }

    const code = generateVerificationCode();

    // One record per address, so asking for a new code replaces the old one.
    await EmailVerification.findOneAndUpdate(
      { email: req.user.email, purpose: "card" },
      {
        email: req.user.email,
        purpose: "card",
        // Tied to the card, so a code for one card cannot change another.
        codeHash: hashToken(`${card._id}:${code}`),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(CODE_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendCardSettingsCodeEmail(
      req.user.email,
      req.user.name,
      card.last4,
      code,
      CODE_EXPIRES_IN_MINUTES,
    );

    return res.status(200).json({
      success: true,
      message: "confirmation code sent to your email",
      data: {
        cardId: card._id,
        last4: card.last4,
        expiresInMinutes: CODE_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCardSettings(req, res, next) {
  try {
    const { code, dailyLimit, status, pin } = req.body;
    const now = new Date();
    const card = await findOwnCard(req.params.cardId, req.user._id);

    if (retireIfExpired(card, now)) {
      await card.save();
    }

    if (card.status === "expired") {
      throw createHttpError(
        409,
        "This card has expired and its settings cannot be changed",
      );
    }

    // Lifting the block is the only thing a blocked card accepts.
    if (card.status === "blocked" && (dailyLimit !== undefined || pin !== undefined)) {
      throw createHttpError(
        409,
        "Unblock this card before changing its limit or PIN",
      );
    }

    // Checked before the code is spent, so a refusal does not waste it.
    if (status !== undefined && BLOCKING_STATUSES.includes(status)) {
      // A blocked card is never swept by retireIfExpired, so check it here.
      if (card.expiresAt <= now) {
        throw createHttpError(409, "This card has expired and cannot be used again");
      }

      await assertNoCardInUse(req.user._id, card._id);
    }

    const verification = await EmailVerification.findOne({
      email: req.user.email,
      purpose: "card",
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

    if (!tokenHashMatches(`${card._id}:${code}`, verification.codeHash)) {
      verification.attempts += 1;
      await verification.save();
      throw createHttpError(
        400,
        "The code is invalid or has expired. Please request a new one",
      );
    }

    const changed = [];

    if (dailyLimit !== undefined) {
      card.dailyLimit = dailyLimit;
      changed.push("dailyLimit");
    }

    if (status !== undefined) {
      card.status = status;
      changed.push("status");
    }

    if (pin !== undefined) {
      card.pinHash = hashToken(pin);
      card.pinSetAt = new Date();
      changed.push("pin");
    }

    await card.save();

    // Used up, so the same code cannot authorise a second change.
    await verification.deleteOne();

    return res.status(200).json({
      success: true,
      message: "card settings updated successfully",
      data: { card: publicCard(card), updated: changed },
    });
  } catch (error) {
    return next(error);
  }
}

function buildPinResetUrl(token) {
  const configured =
    process.env.CLIENT_APP_URL ||
    (process.env.CLIENT_ORIGINS || "http://localhost:3001").split(",")[0];

  return `${configured.trim().replace(/\/$/, "")}/set-card-pin?token=${token}`;
}

async function forgotCardPin(req, res, next) {
  try {
    const card = await findOwnCard(req.params.cardId, req.user._id);

    if (retireIfExpired(card, new Date())) {
      await card.save();
    }

    if (LOCKED_STATUSES.includes(card.status)) {
      throw createHttpError(
        409,
        `This card is ${card.status} and cannot have a PIN set`,
      );
    }

    // 32 random bytes, so the link cannot be guessed and needs no attempt limit.
    const token = crypto.randomBytes(32).toString("hex");

    await EmailVerification.findOneAndUpdate(
      { email: req.user.email, purpose: "cardPin" },
      {
        email: req.user.email,
        purpose: "cardPin",
        codeHash: hashToken(token),
        attempts: 0,
        verified: false,
        expiresAt: minutesFromNow(PASSWORD_RESET_EXPIRES_IN_MINUTES),
      },
      { upsert: true },
    );

    await sendCardPinResetEmail(
      req.user.email,
      req.user.name,
      card.last4,
      buildPinResetUrl(token),
      PASSWORD_RESET_EXPIRES_IN_MINUTES,
    );

    return res.status(200).json({
      success: true,
      message: "a link to set your card PIN is on its way to your email",
      data: {
        cardId: card._id,
        last4: card.last4,
        expiresInMinutes: PASSWORD_RESET_EXPIRES_IN_MINUTES,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function resetCardPin(req, res, next) {
  try {
    const { token, pin } = req.body;

    // The stored hash is deterministic, so the token itself finds the record.
    const reset = await EmailVerification.findOne({
      purpose: "cardPin",
      codeHash: hashToken(token),
    });

    if (!reset || reset.expiresAt <= new Date()) {
      throw createHttpError(
        400,
        "This link is invalid or has expired. Please request a new one",
      );
    }

    const owner = await User.findOne({ email: reset.email }).select("_id").lean();

    // The issuing rule allows only one card in these states, so this is unique.
    const card = owner
      ? await DebitCard.findOne({
          user: owner._id,
          status: { $in: BLOCKING_STATUSES },
        })
      : null;

    if (!card || card.expiresAt <= new Date()) {
      await reset.deleteOne();
      throw createHttpError(
        400,
        "This link is invalid or has expired. Please request a new one",
      );
    }

    card.pinHash = hashToken(pin);
    card.pinSetAt = new Date();
    await card.save();

    // Used up, so the same link cannot set a second PIN.
    await reset.deleteOne();

    return res.status(200).json({
      success: true,
      message: "card PIN set successfully",
      data: { card: publicCard(card) },
    });
  } catch (error) {
    return next(error);
  }
}

async function listDebitCards(req, res, next) {
  try {
    const now = new Date();
    // Opt in, so the secrets travel only when the customer asks to see them.
    const reveal = req.query.reveal === "true";

    const query = DebitCard.find({ user: req.user._id }).sort({ issuedAt: -1 });

    if (reveal) {
      query.select("+cardNumberEnc +cvvEnc");
    }

    const cards = await query;

    // Expiry is settled on read, so a lapsed card never shows as active.
    await Promise.all(
      cards.map((card) => (retireIfExpired(card, now) ? card.save() : null)),
    );

    return res.status(200).json({
      success: true,
      message: "debit cards fetched successfully",
      data: {
        cards: cards.map((card) => {
          const base = publicCard(card);

          if (!reveal) {
            return base;
          }

          return {
            ...base,
            // Null for cards issued before encryption was added.
            cardNumber: decryptSecret(card.cardNumberEnc),
            cvv: decryptSecret(card.cvvEnc),
          };
        }),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requestDebitCard,
  listDebitCards,
  sendCardSettingsCode,
  updateCardSettings,
  forgotCardPin,
  resetCardPin,
  publicCard,
};
