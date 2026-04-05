const mongoose = require("mongoose");
const Inventory = require("../models/inventory.model");

const DEFAULT_WAREHOUSE = process.env.DEFAULT_WAREHOUSE_ADDRESS || "Kho mặc định";

const toObjectId = (productId) => {
    const s = String(productId);
    return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s;
};

/**
 * @param {string} productId
 */
const findByProductId = async (productId) => {
    return Inventory.findOne({ productId: toObjectId(productId) }).lean();
};

/**
 * @param {string[]} productIds
 */
const findByProductIds = async (productIds) => {
    if (!productIds || !productIds.length) return [];
    const oids = productIds.map(toObjectId);
    return Inventory.find({ productId: { $in: oids } }).lean();
};

/**
 * Cập nhật hoặc tạo bản ghi tồn (quantity). Lần tạo mới gán warehouse mặc định nếu chưa có.
 * @param {string} productId
 * @param {number} quantityOnHand
 */
const upsertQuantity = async (productId, quantityOnHand) => {
    const q = Math.max(0, Math.floor(Number(quantityOnHand)));
    await Inventory.findOneAndUpdate(
        { productId: toObjectId(productId) },
        {
            $set: { quantityOnHand: q },
            $setOnInsert: { warehouseAddress: DEFAULT_WAREHOUSE },
        },
        { upsert: true, new: true, runValidators: true },
    );
};

/**
 * @param {string} productId
 * @param {{ quantityOnHand: number, warehouseAddress?: string }} data
 */
const upsertFull = async (productId, data) => {
    const q = Math.max(0, Math.floor(Number(data.quantityOnHand)));
    const wh =
        data.warehouseAddress !== undefined && data.warehouseAddress !== null
            ? String(data.warehouseAddress).trim()
            : undefined;

    const update = { $set: { quantityOnHand: q }, $setOnInsert: { warehouseAddress: DEFAULT_WAREHOUSE } };
    if (wh !== undefined) {
        update.$set.warehouseAddress = wh;
    }

    await Inventory.findOneAndUpdate({ productId: toObjectId(productId) }, update, {
        upsert: true,
        new: true,
        runValidators: true,
    });
};

/**
 * Tạo bản ghi inventories cho sản phẩm chưa có dòng (theo invMap đã load).
 * @param {Array<{ _id: import('mongoose').Types.ObjectId, productQuantity: number }>} products
 * @param {Map<string, unknown>} invMap
 */
const bulkEnsureMissing = async (products, invMap) => {
    const bulk = [];
    for (const p of products) {
        if (!invMap.has(p._id.toString())) {
            bulk.push({
                updateOne: {
                    filter: { productId: p._id },
                    update: {
                        $set: { quantityOnHand: p.productQuantity },
                        $setOnInsert: { warehouseAddress: DEFAULT_WAREHOUSE },
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
    DEFAULT_WAREHOUSE,
    findByProductId,
    findByProductIds,
    upsertQuantity,
    upsertFull,
    bulkEnsureMissing,
};
