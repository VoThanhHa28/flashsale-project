"use strict";

const ReservationModel = require("../models/reservation.model");
const OrderModel = require("../models/order.model");
const ProductModel = require("../models/product.model");
const { BadRequestError, NotFoundError, ConflictError } = require("../core/error.response");
const CONST = require("../constants");
const redisClient = require("../config/redis");

class CheckoutService {
    /**
     * Lock inventory for checkout (5 min countdown)
     * @param {String} userId - User ID
     * @param {String} productId - Product ID
     * @param {Number} quantity - Quantity to lock
     * @param {String} clientOrderId - Idempotency key
     * @returns {Object} Reservation with expiresIn (seconds)
     */
    static async initiateCheckout(userId, productId, quantity, clientOrderId) {
        // Validate product exists + has stock
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        // Check idempotency - if same clientOrderId exists and not expired, return it
        const existingRes = await ReservationModel.findOne({
            client_order_id: clientOrderId,
            type: "checkout",
            status: { $ne: "failed" },
        });

        if (existingRes) {
            // Return existing reservation
            const expiresIn = Math.max(0, Math.floor((existingRes.expire_at - Date.now()) / 1000));
            return {
                reservation_id: existingRes._id,
                product_id: existingRes.product_id,
                product_name: product.productName,
                quantity: existingRes.quantity,
                expiresIn,
                created_at: existingRes.createdAt,
            };
        }

        // Create new checkout reservation (5 min lock)
        const reservation = await ReservationModel.create({
            user_id: userId,
            product_id: productId,
            client_order_id: clientOrderId,
            quantity,
            status: "pending",
            type: "checkout", // 5 min TTL
            expire_at: new Date(Date.now() + 5 * 60 * 1000),
        });

        const expiresIn = 5 * 60; // 300 seconds

        return {
            reservation_id: reservation._id,
            product_id: reservation.product_id,
            product_name: product.productName,
            quantity: reservation.quantity,
            expiresIn,
            created_at: reservation.createdAt,
        };
    }

    /**
     * Get checkout status + remaining time
     * @param {String} reservationId - Reservation ID
     * @returns {Object} Reservation status with remaining time
     */
    static async getCheckoutStatus(reservationId) {
        const reservation = await ReservationModel.findById(reservationId);
        if (!reservation || reservation.type !== "checkout") {
            throw new NotFoundError("Checkout session not found or expired");
        }

        // Check if expired
        if (reservation.expire_at < new Date()) {
            await ReservationModel.findByIdAndUpdate(reservationId, {
                status: "failed",
                note: "Checkout timeout - expired",
            });
            throw new BadRequestError("Checkout time expired");
        }

        const product = await ProductModel.findById(reservation.product_id);
        const expiresIn = Math.max(0, Math.floor((reservation.expire_at - Date.now()) / 1000));

        return {
            reservation_id: reservation._id,
            product_id: reservation.product_id,
            product_name: product?.productName,
            quantity: reservation.quantity,
            status: reservation.status,
            expiresIn,
        };
    }

    /**
     * Confirm checkout + create order
     * Must complete before 5 min expires
     * @param {String} userId - User ID (from req.user._id)
     * @param {String} reservationId - Reservation ID
     * @param {Object} orderData - Order details (address, etc.)
     * @returns {Object} Created order
     */
    static async confirmCheckout(userId, reservationId, orderData) {
        const reservation = await ReservationModel.findById(reservationId);
        if (!reservation || reservation.type !== "checkout") {
            throw new NotFoundError("Checkout session not found");
        }

        // Verify user owns this checkout (normalize both to strings for comparison)
        const reservationUserId = reservation.user_id.toString();
        const currentUserId = String(userId);
        
        if (reservationUserId !== currentUserId) {
            throw new BadRequestError(
                `Unauthorized - checkout belongs to user ${reservationUserId.substring(0, 8)}..., not ${currentUserId.substring(0, 8)}...`
            );
        }

        // Check expiry
        if (reservation.expire_at < new Date()) {
            await ReservationModel.findByIdAndUpdate(reservationId, {
                status: "failed",
                note: "Checkout timeout - expired before confirm",
            });
            throw new BadRequestError("Checkout time expired");
        }

        // Get product price for order
        const product = await ProductModel.findById(reservation.product_id);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        // Create order - use correct field names for Order model
        const order = await OrderModel.create({
            userId: userId,  // ← camelCase (Order model expects this)
            productId: reservation.product_id,  // ← camelCase
            quantity: reservation.quantity,
            price: product.productPrice,  // ← must include price
            client_order_id: reservation.client_order_id,
            order_status: "pending",
            ...orderData,
        });

        // Update reservation to awaiting_payment (waiting for user payment)
        await ReservationModel.findByIdAndUpdate(reservationId, {
            status: "awaiting_payment",
        });

        return {
            order_id: order._id,
            client_order_id: order.client_order_id,
            status: order.order_status,
            message: "Order created successfully",
        };
    }
}

module.exports = CheckoutService;
