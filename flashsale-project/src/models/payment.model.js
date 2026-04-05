"use strict";

const mongoose = require("mongoose");
const { PAYMENT } = require("../constants/order.constants");

const paymentSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [0, "Số tiền không được âm"],
        },
        currency: {
            type: String,
            default: PAYMENT.CURRENCY.VND,
            trim: true,
            uppercase: true,
        },
        status: {
            type: String,
            enum: Object.values(PAYMENT.STATUS),
            default: PAYMENT.STATUS.PENDING,
            index: true,
        },
        method: {
            type: String,
            default: PAYMENT.METHOD.COD,
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: "payments",
    },
);

module.exports = mongoose.model("Payment", paymentSchema);
