const express = require("express");
const router = express.Router();

const InventoryTransactionController = require("../controllers/inventoryTransaction.controller");
const validate = require("../middlewares/validate.middleware");
const { verifyToken } = require("../middlewares/auth");
const { checkRole } = require("../middlewares/role");
const inventoryValidation = require("../validation/inventoryTransaction.validation");

// Admin: Create transaction (import/export)
router.post(
    "/",
    verifyToken,
    checkRole("SHOP_ADMIN"),
    validate(inventoryValidation.createTransaction),
    InventoryTransactionController.createTransaction
);

// Admin: Get own transaction history (⚠️ MUST BE BEFORE /:productId routes!)
router.get(
    "/admin/history",
    verifyToken,
    checkRole("SHOP_ADMIN"),
    InventoryTransactionController.getAdminTransactionHistory
);

// Get product total quantity (anyone can view)
router.get(
    "/:productId/total",
    InventoryTransactionController.getProductTotalQty
);

// Get product transaction history (anyone can view)
router.get(
    "/:productId/history",
    InventoryTransactionController.getProductTransactionHistory
);

// Admin: Update transaction status
router.patch(
    "/:transactionId/status",
    verifyToken,
    checkRole("SHOP_ADMIN"),
    validate(inventoryValidation.updateStatus),
    InventoryTransactionController.updateTransactionStatus
);

module.exports = router;
