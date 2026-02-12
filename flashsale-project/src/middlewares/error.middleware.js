const CONST = require('../constants');

module.exports = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  let statusCode =
    err.statusCode || CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR;

  let message =
    err.message || 'Internal Server Error';

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = CONST.HTTP_STATUS.BAD_REQUEST;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Duplicate key
  if (err.code === 11000) {
    statusCode = CONST.HTTP_STATUS.BAD_REQUEST;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = CONST.HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid data format';
  }

  return res.status(statusCode).json({
    statusCode,
    message,
    errors: isDev ? err.metadata : undefined,
    stack: isDev ? err.stack : undefined,
  });
};
