const AppError = require('../core/error.response');
const CONST = require('../constants');

/**
 * validate(schema)
 * schema = { body?, params?, query? }
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, { abortEarly: false });
        if (error) {
          return next(
            new AppError(
              CONST.MESSAGES.COMMON.VALIDATION_ERROR,
              CONST.HTTP_STATUS.BAD_REQUEST,
              error.details // <-- cho dev
            )
          );
        }
        req.body = value;
      }

      if (schema.params) {
        const { error, value } = schema.params.validate(req.params);
        if (error) {
          return next(
            new AppError(
              CONST.MESSAGES.COMMON.VALIDATION_ERROR,
              CONST.HTTP_STATUS.BAD_REQUEST,
              error.details
            )
          );
        }
        req.params = value;
      }

      if (schema.query) {
        const { error, value } = schema.query.validate(req.query);
        if (error) {
          return next(
            new AppError(
              CONST.MESSAGES.COMMON.VALIDATION_ERROR,
              CONST.HTTP_STATUS.BAD_REQUEST,
              error.details
            )
          );
        }
        req.query = value;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = validate;
