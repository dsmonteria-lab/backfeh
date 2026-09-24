const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dispenserController = require('../controllers/dispenserController');

// Todas las rutas del módulo de surtidores requieren autenticación JWT
router.use(authenticateToken);

// ==========================================
// 1. RUTAS ESTÁTICAS (Siempre van primero)
// ==========================================

// Rutas base de surtidores
router.get('/', dispenserController.getDispensers);
router.post('/', dispenserController.createDispenser);

// Rutas de Mangueras / Posiciones (Creación)
router.post('/hoses', dispenserController.createHose);

// Rutas de Apertura y Cierre Mecánico
router.post('/opening/start', dispenserController.startDispenserOpening);
router.post('/opening/close', dispenserController.closeDispenserOpening);

// Rutas de Mantenimiento y Autorización
router.post('/maintenance', dispenserController.registerMaintenance);
router.post('/authorize-return', dispenserController.authorizeReturnToService);

// Auditoría
router.get('/audit-logs', dispenserController.getAuditLogs);

// ==========================================
// 2. RUTAS CON PARÁMETROS DINÁMICOS (/:id)
// ==========================================

// Rutas de Surtidores (Edición, Eliminación, Estado)
router.put('/:id', dispenserController.updateDispenser);
router.delete('/:id', dispenserController.deleteDispenser);
router.patch('/:id/status', dispenserController.toggleDispenserStatus);

// Rutas de Mangueras / Posiciones asociadas a un Surtidor
router.get('/:dispenser_id/hoses', dispenserController.getHosesByDispenser);
router.put('/hoses/:id', dispenserController.updateHose);

// Rutas de Apertura Mecánica asociadas a un Surtidor
router.get('/:dispenser_id/active-opening', dispenserController.getActiveOpening);

module.exports = router;