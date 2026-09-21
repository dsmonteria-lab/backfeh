const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dispenserController = require('../controllers/dispenserController');

// Todas las rutas del módulo de surtidores requieren autenticación JWT
router.use(authenticateToken);

// Rutas de Surtidores
router.get('/', dispenserController.getDispensers);
router.post('/', dispenserController.createDispenser);
router.put('/:id', dispenserController.updateDispenser);
router.delete('/:id', dispenserController.deleteDispenser);
router.patch('/:id/status', dispenserController.toggleDispenserStatus);

// Rutas de Mangueras / Posiciones
router.get('/:dispenser_id/hoses', dispenserController.getHosesByDispenser);
router.post('/hoses', dispenserController.createHose);
router.put('/hoses/:id', dispenserController.updateHose);

// Rutas de Apertura y Cierre Mecánico
router.get('/:dispenser_id/active-opening', dispenserController.getActiveOpening);
router.post('/opening/start', dispenserController.startDispenserOpening);
router.post('/opening/close', dispenserController.closeDispenserOpening);

// Rutas de Mantenimiento y Autorización
router.post('/maintenance', dispenserController.registerMaintenance);
router.post('/authorize-return', dispenserController.authorizeReturnToService);

// Auditoría
router.get('/audit-logs', dispenserController.getAuditLogs);

module.exports = router;
