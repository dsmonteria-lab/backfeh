const express = require('express');
const router = express.Router();
const { getAllSettings, updateSetting } = require('../controllers/settingController');
const { protect, authorizeRole } = require('../middleware/authMiddleware');

// All settings routes require admin privileges
router.use(protect);
router.use(authorizeRole('admin'));

router.get('/', getAllSettings);
router.put('/:key', updateSetting);

module.exports = router;
