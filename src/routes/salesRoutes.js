const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const salesController = require('../controllers/salesController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Todas las rutas requieren autenticacion
router.use(authenticateToken);

// Registrar venta - accesible para admin y vendedor
router.post(
  '/',
  [
    body('product_id').isInt().withMessage('ID de producto invalido'),
    body('galones').isFloat({ min: 0 }).withMessage('Galones deben ser positivos'),
    body('total_dinero').isFloat({ min: 0 }).withMessage('Total debe ser positivo'),
    body('metodo_pago').isIn(['efectivo', 'tarjeta', 'movil', 'transferencia'])
  ],
  validate, salesController.createSale
);

// Obtener ventas del usuario - accesible para admin y vendedor
router.get('/user', salesController.getUserSales);

// Obtener todas las ventas - solo admin
router.get('/', authorizeRole('admin'), salesController.getAllSales);

// Actualizar venta - solo admin
router.put('/:id', authorizeRole('admin'), salesController.updateSale);

// Eliminar venta - solo admin
router.delete('/:id', authorizeRole('admin'), salesController.deleteSale);

// Dashboard stats - solo admin
router.get('/dashboard', authorizeRole('admin'), salesController.getDashboardStats);

// Proyeccion de ventas - solo admin
router.get('/forecast', authorizeRole('admin'), salesController.getSalesForecast);

module.exports = router;
