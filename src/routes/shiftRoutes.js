const express = require('express');
const router = express.Router();
const { getActiveShift, startShift, closeShift } = require('../controllers/shiftController');
const verifyToken = require('../middleware/authMiddleware'); // Ajusta según tu importación de auth

router.get('/active', verifyToken, getActiveShift);
router.post('/start', verifyToken, startShift);
router.post('/close', verifyToken, closeShift);

fmt = router;
module.exports = router;