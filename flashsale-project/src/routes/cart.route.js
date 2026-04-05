"use strict";

const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate.middleware");
const cartValidation = require("../validation/cart.validation");
const CartController = require("../controllers/cart.controller");

/**
 * @route   GET /v1/api/cart
 * @desc    Giỏ hàng của user đăng nhập
 * @access  Private
 */
router.get("/", auth.verifyToken, CartController.getMyCart);

/**
 * @route   POST /v1/api/cart/items
 * @desc    Thêm sản phẩm (hoặc gộp số lượng nếu đã có)
 * @access  Private
 */
router.post("/items", auth.verifyToken, validate(cartValidation.addItem), CartController.addItem);

/**
 * @route   PATCH /v1/api/cart/items/:productId
 * @desc    Cập nhật số lượng dòng
 * @access  Private
 */
router.patch(
    "/items/:productId",
    auth.verifyToken,
    validate(cartValidation.updateItem),
    CartController.updateItem,
);

/**
 * @route   DELETE /v1/api/cart/items/:productId
 * @desc    Xóa dòng khỏi giỏ
 * @access  Private
 */
router.delete(
    "/items/:productId",
    auth.verifyToken,
    validate(cartValidation.removeItem),
    CartController.removeItem,
);

module.exports = router;
