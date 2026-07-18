const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mechanicalController = require('../controllers/mechanicalController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Crear registro mecanico - accesible para admin y vendedor
router.post(
  '/',
  [
    body('product_id').isInt().withMessage('ID de producto invalido'),
    body('lectura_inicial').isFloat().withMessage('Lectura inicial invalida'),
    body('lectura_final').isFloat().withMessage('Lectura final invalida'),
    body('turno_inicio').isISO8601().withMessage('Fecha de inicio invalida'),
    body('turno_fin').isISO8601().withMessage('Fecha de fin invalida')
  ],
  validate, mechanicalController.createMechanicalLog
);

// Obtener último registro - accesible para admin y vendedor
router.get('/last', mechanicalController.getLastShiftLog);

// Obtener registros por turno - accesible para admin y vendedor
router.get('/turno', mechanicalController.getMechanicalLogsByTurno);

// Obtener todos los registros - solo admin
router.get('/', authorizeRole('admin'), mechanicalController.getAllMechanicalLogs);

// Actualizar registro - solo admin
router.put('/:id', authorizeRole('admin'), mechanicalController.updateMechanicalLog);

// Eliminar registro - solo admin
router.delete('/:id', authorizeRole('admin'), mechanicalController.deleteMechanicalLog);

// Obtener descuadres - solo admin
router.get('/descuadres', authorizeRole('admin'), mechanicalController.getDesCuadres);

module.exports = router;
