const express = require('express');
const router = express.Router();
const { getActiveShift, startShift, closeShift, getAllShifts } = require('../controllers/shiftController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, getAllShifts);
router.get('/active', verifyToken, getActiveShift);
router.post('/start', verifyToken, startShift);
router.post('/close', verifyToken, closeShift);

module.exports = router;