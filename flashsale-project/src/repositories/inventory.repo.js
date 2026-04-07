const mongoose = require("mongoose");
const Inventory = require("../models/inventory.model");

const toObjectId = (productId) => {
    const s = String(productId);
    return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s;
};

/**
 * @param {string} productId
 */
const findByProductId = async (productId) => {
    return Inventory.findOne({ product_id: toObjectId(productId) }).lean();
};

/**
 * @param {string[]} productIds
 */
const findByProductIds = async (productIds) => {
    if (!productIds || !productIds.length) return [];
    const oids = productIds.map(toObjectId);
    return Inventory.find({ product_id: { $in: oids } }).lean();
};

/**
 * Cập nhật hoặc tạo bản ghi tồn (stock) — khớp schema: product_id, stock
 * @param {string} productId
 * @param {number} stockValue
 */
const upsertQuantity = async (productId, stockValue) => {
    const q = Math.max(0, Math.floor(Number(stockValue)));
    const pid = toObjectId(productId);
    await Inventory.findOneAndUpdate(
        { product_id: pid },
        {
            $set: { stock: q },
            $setOnInsert: { product_id: pid, is_active: true },
        },
        { upsert: true, returnDocument: "after", runValidators: true },
    );
};

/**
 * @param {string} productId
 * @param {{ quantityOnHand: number, warehouseAddress?: string }} data — quantityOnHand map sang stock (tương thích tên cũ)
 */
const upsertFull = async (productId, data) => {
    const q = Math.max(0, Math.floor(Number(data.quantityOnHand ?? data.stock)));
    const pid = toObjectId(productId);
    const update = { $set: { stock: q }, $setOnInsert: { product_id: pid, is_active: true } };

    await Inventory.findOneAndUpdate({ product_id: pid }, update, {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
    });
};

/**
 * Tạo bản ghi inventories cho sản phẩm chưa có dòng (theo invMap đã load).
 * @param {Array<{ _id: import('mongoose').Types.ObjectId, productQuantity: number }>} products
 * @param {Map<string, unknown>} invMap — key = product_id string
 */
const bulkEnsureMissing = async (products, invMap) => {
    const bulk = [];
    for (const p of products) {
        const key = p._id.toString();
        if (!invMap.has(key)) {
            bulk.push({
                updateOne: {
                    filter: { product_id: p._id },
                    update: {
                        $set: { stock: p.productQuantity },
                        $setOnInsert: { product_id: p._id, is_active: true },
                    },
                    upsert: true,
                },
            });
        }
    }
    if (bulk.length) {
        await Inventory.bulkWrite(bulk);
    }
};

module.exports = {
    findByProductId,
    findByProductIds,
    upsertQuantity,
    upsertFull,
    bulkEnsureMissing,
};
