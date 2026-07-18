const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All purchase routes require admin role
router.use(authenticateToken);
router.use(authorizeRole('admin'));

// Create a new purchase (increase stock)
router.post('/', purchaseController.createPurchase);

// Get all purchases
router.get('/', purchaseController.getPurchases);

module.exports = router;
