"use strict";

const mongoose = require("mongoose");
const CartModel = require("../models/cart.model");
const Product = require("../models/product.model");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const CONST = require("../constants");
const { isFlashSaleWindowActive } = require("../utils/productFlashWindow");

class CartService {
    static _serializeItem(it) {
        const pid = it.productId;
        return {
            productId: pid && pid.toString ? pid.toString() : String(pid),
            productName: it.productName,
            productThumb: it.productThumb || "",
            price: it.price,
            quantity: it.quantity,
        };
    }

    static serializeCart(cart) {
        if (!cart) return null;
        const items = (cart.items || []).map((x) => CartService._serializeItem(x));
        const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
        const totalQuantity = items.reduce((s, it) => s + it.quantity, 0);
        return {
            userId: cart.userId && cart.userId.toString ? cart.userId.toString() : String(cart.userId),
            items,
            totalAmount,
            totalQuantity,
            updatedAt: cart.updatedAt,
        };
    }

    static async _getOrCreateCartDoc(userId) {
        const uid = new mongoose.Types.ObjectId(userId);
        let cart = await CartModel.findOne({ userId: uid });
        if (!cart) {
            cart = new CartModel({ userId: uid, items: [] });
            await cart.save();
        }
        return cart;
    }

    static async _loadProductForCart(productId) {
        const product = await Product.findById(productId)
            .select(
                "productName productThumb productPrice productQuantity isPublished productStartTime productEndTime is_deleted",
            )
            .lean();
        if (!product || product.is_deleted) {
            throw new NotFoundError("Sản phẩm không tồn tại");
        }
        if (!product.isPublished) {
            throw new BadRequestError("Sản phẩm không còn được bán");
        }
        if (isFlashSaleWindowActive(product)) {
            throw new BadRequestError(CONST.CART.MESSAGE.FLASH_SALE_BYPASS);
        }
        return product;
    }

    static async getMyCart(userId) {
        const cart = await CartService._getOrCreateCartDoc(userId);
        cart.refreshExpiry();
        await cart.save();
        return CartService.serializeCart(cart.toObject());
    }

    static async addItem(userId, productId, quantity) {
        const product = await CartService._loadProductForCart(productId);
        const stock = product.productQuantity ?? 0;
        if (stock <= 0) {
            throw new BadRequestError("Sản phẩm đã hết hàng");
        }

        const cart = await CartService._getOrCreateCartDoc(userId);
        const pid = new mongoose.Types.ObjectId(productId);
        const idx = cart.items.findIndex((it) => it.productId.equals(pid));
        const nextQty = idx >= 0 ? cart.items[idx].quantity + quantity : quantity;
        if (nextQty > stock) {
            throw new BadRequestError(`Chỉ còn ${stock} sản phẩm trong kho`);
        }

        if (idx >= 0) {
            cart.items[idx].quantity = nextQty;
            cart.items[idx].productName = product.productName;
            cart.items[idx].productThumb = product.productThumb || "";
            cart.items[idx].price = product.productPrice;
        } else {
            if (cart.items.length >= CONST.CART.MAX_ITEMS) {
                throw new BadRequestError(CONST.CART.MESSAGE.MAX_ITEMS_EXCEEDED);
            }
            cart.items.push({
                productId: pid,
                productName: product.productName,
                productThumb: product.productThumb || "",
                price: product.productPrice,
                quantity,
            });
        }

        cart.refreshExpiry();
        await cart.save();
        return CartService.serializeCart(cart.toObject());
    }

    static async updateItemQuantity(userId, productId, quantity) {
        const product = await CartService._loadProductForCart(productId);
        const stock = product.productQuantity ?? 0;

        const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!cart) {
            throw new NotFoundError(CONST.CART.MESSAGE.NOT_FOUND);
        }

        const pid = new mongoose.Types.ObjectId(productId);
        const idx = cart.items.findIndex((it) => it.productId.equals(pid));
        if (idx < 0) {
            throw new NotFoundError(CONST.CART.MESSAGE.ITEM_NOT_FOUND);
        }

        if (quantity > stock) {
            throw new BadRequestError(`Chỉ còn ${stock} sản phẩm trong kho`);
        }

        cart.items[idx].quantity = quantity;
        cart.items[idx].productName = product.productName;
        cart.items[idx].productThumb = product.productThumb || "";
        cart.items[idx].price = product.productPrice;

        cart.refreshExpiry();
        await cart.save();
        return CartService.serializeCart(cart.toObject());
    }

    static async removeItem(userId, productId) {
        const cart = await CartModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!cart) {
            throw new NotFoundError(CONST.CART.MESSAGE.NOT_FOUND);
        }

        const pid = new mongoose.Types.ObjectId(productId);
        const before = cart.items.length;
        cart.items = cart.items.filter((it) => !it.productId.equals(pid));
        if (cart.items.length === before) {
            throw new NotFoundError(CONST.CART.MESSAGE.ITEM_NOT_FOUND);
        }

        cart.refreshExpiry();
        await cart.save();
        return CartService.serializeCart(cart.toObject());
    }
}

module.exports = CartService;
