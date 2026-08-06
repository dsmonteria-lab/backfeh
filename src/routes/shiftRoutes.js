const express = require('express');
const router = express.Router();
const { getActiveShift, startShift, closeShift, getAllShifts } = require('../controllers/shiftController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, getAllShifts);
router.get('/active', authenticateToken, getActiveShift);
router.post('/start', authenticateToken, startShift);
router.post('/close', authenticateToken, closeShift);

module.exports = router;