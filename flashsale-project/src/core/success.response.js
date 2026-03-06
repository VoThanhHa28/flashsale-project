const CONST = require('../constants');

class SuccessResponse {
    constructor({ message = CONST.MESSAGES.COMMON.SUCCESS, statusCode = 200, data = {} }) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    send(res) {
        return res.status(this.statusCode).json({
            statusCode: this.statusCode,
            message: this.message,
            data: this.data
        });
    }
}

class OK extends SuccessResponse {
    constructor({ message = 'OK', data }) {
        super({ message, statusCode: CONST.HTTP_STATUS.OK, data });
    }
}

class CREATED extends SuccessResponse {
    constructor({ message = 'Created', data }) {
        super({ message, statusCode: CONST.HTTP_STATUS.CREATED, data });
    }
}

module.exports = { OK, CREATED, SuccessResponse };
