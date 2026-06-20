function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
    const message = field
      ? `An account with this ${field} already exists`
      : "A duplicate account conflict occurred";

    return res.status(409).json({
      success: false,
      message,
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 ? "An unexpected server error occurred" : error.message,
  });
}

module.exports = errorHandler;
