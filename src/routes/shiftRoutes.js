const express = require('express');
const router = express.Router();
const { getActiveShift, startShift, closeShift, getAllShifts, adminCloseShift } = require('../controllers/shiftController');
const { authenticateToken } = require('../middleware/auth');

// Aplica el middleware de autenticación a todas las rutas de este archivo
router.use(authenticateToken);

router.get('/', getAllShifts);
router.get('/active', getActiveShift);
router.post('/start', startShift);
router.post('/close', closeShift);
router.post('/admin-close', adminCloseShift);

module.exports = router;