const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const validate = require('../middlewares/validate.middleware');
const categoryValidation = require('../validation/category.validation');
const { verifyToken } = require('../middlewares/auth');
const { requireShopAdmin } = require('../middlewares/rbac');

router.get('/', categoryController.getCategories);
router.get('/:id', validate(categoryValidation.getCategoryById), categoryController.getCategoryById);
router.post('/', verifyToken, requireShopAdmin, validate(categoryValidation.createCategory), categoryController.createCategory);
router.put('/:id', verifyToken, requireShopAdmin, validate(categoryValidation.updateCategory), categoryController.updateCategory);
router.delete('/:id', verifyToken, requireShopAdmin, validate(categoryValidation.deleteCategory), categoryController.deleteCategory);

module.exports = router;