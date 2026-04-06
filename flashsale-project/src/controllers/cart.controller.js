"use strict";

const asyncHandler = require("../utils/asyncHandler");
const { OK } = require("../core/success.response");
const CONST = require("../constants");
const CartService = require("../services/cart.service");

class CartController {
    static getMyCart = asyncHandler(async (req, res) => {
        const cart = await CartService.getMyCart(req.user._id);
        return new OK({
            message: CONST.MESSAGES.COMMON.SUCCESS,
            data: { cart },
        }).send(res);
    });

    static addItem = asyncHandler(async (req, res) => {
        const { productId, quantity } = req.body;
        const cart = await CartService.addItem(req.user._id, productId, quantity);
        return new OK({
            message: CONST.CART.MESSAGE.UPDATED,
            data: { cart },
        }).send(res);
    });

    static updateItem = asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { quantity } = req.body;
        const cart = await CartService.updateItemQuantity(req.user._id, productId, quantity);
        return new OK({
            message: CONST.CART.MESSAGE.UPDATED,
            data: { cart },
        }).send(res);
    });

    static removeItem = asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const cart = await CartService.removeItem(req.user._id, productId);
        return new OK({
            message: CONST.CART.MESSAGE.UPDATED,
            data: { cart },
        }).send(res);
    });
}

module.exports = CartController;
