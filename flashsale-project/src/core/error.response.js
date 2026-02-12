const CONST = require('../constants');


class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

class ConflictRequestError extends AppError {
    constructor(message = 'Conflict error') {
        super(message, CONST.HTTP_STATUS.CONFLICT); 
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad Request') {
        super(message, CONST.HTTP_STATUS.BAD_REQUEST);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Not Found') {
        super(message, CONST.HTTP_STATUS.NOT_FOUND);
    }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, CONST.HTTP_STATUS.UNAUTHORIZED);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, CONST.HTTP_STATUS.FORBIDDEN);
  }
}


module.exports = {
    AppError,
    BadRequestError,
    NotFoundError,
    ConflictRequestError,
    UnauthorizedError,
    ForbiddenError,
};
