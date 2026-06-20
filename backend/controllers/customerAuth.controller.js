const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user");
const Account = require("../models/account");
const generateAccountNumber = require("../utils/generateAccountNumber");
const generateToken = require("../utils/generateToken");

async function registerCustomer(req, res, next) {
  const session = await mongoose.startSession();

  try {
    const { name, email, phoneNumber, dateOfBirth, password } = req.body;
    const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let createdUser;

    await session.withTransaction(async () => {
      const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }],
      })
        .select("_id email phoneNumber")
        .session(session);

      if (existingUser) {
        const error = new Error(
          existingUser.email === email
            ? "An account with this email already exists"
            : "An account with this phone number already exists"
        );
        error.statusCode = 409;
        throw error;
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
        { session }
      );

      await Account.create(
        [
          {
            user: createdUser._id,
            accountNumber: generateAccountNumber(),
            status: "pending",
          },
        ],
        { session }
      );
    });

    const token = generateToken(createdUser);
    const userData = createdUser.toObject();
    delete userData.passwordHash;

    return res.status(201).json({
      success: true,
      message: "account request successfully created",
      data: userData,
      token,
    });
  } catch (error) {
    return next(error);
  } finally {
    await session.endSession();
  }
}

module.exports = {
  registerCustomer,
};
