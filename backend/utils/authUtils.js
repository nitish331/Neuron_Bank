function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicRegistrationUser(user) {
  return {
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
  };
}

function publicLoginData(user, account) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    accountStatus: account?.status ?? null,
    accountNumber: account?.accountNumber ?? null,
    balance: account?.balance ?? null,
  };
}

module.exports = {
  createHttpError,
  publicRegistrationUser,
  publicLoginData,
};
