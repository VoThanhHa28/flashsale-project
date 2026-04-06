/**
 * Xóa index legacy productId trên inventories (schema hiện tại dùng product_id).
 * Chạy một lần: node src/scripts/fixInventoryIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Inventory = require("../models/inventory.model");

(async () => {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("Missing MONGO_URI");
        process.exit(1);
    }
    await mongoose.connect(uri);
    const col = Inventory.collection;
    const indexes = await col.indexes();
    const names = indexes.map((i) => i.name);
    console.log("Indexes trước:", names);

    for (const name of names) {
        if (name === "productId_1" || name.startsWith("productId_")) {
            try {
                await col.dropIndex(name);
                console.log("Đã drop:", name);
            } catch (e) {
                console.warn("Không drop được", name, e.message);
            }
        }
    }

    const bad = await col.deleteMany({
        $or: [{ product_id: null }, { product_id: { $exists: false } }],
    });
    if (bad.deletedCount) {
        console.log("Đã xóa bản ghi inventories không có product_id:", bad.deletedCount);
    }

    await Inventory.syncIndexes();
    console.log("Indexes sau:", (await col.indexes()).map((i) => i.name));
    await mongoose.disconnect();
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
