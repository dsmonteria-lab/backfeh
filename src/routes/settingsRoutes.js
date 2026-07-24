const express = require('express');
const router = express.Router();
const { getAllSettings, updateSetting } = require('../controllers/settingController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// All settings routes require admin privileges
router.use(authenticateToken);
router.use(authorizeRole('admin'));

router.get('/', getAllSettings);
router.put('/:key', updateSetting);

module.exports = router;
