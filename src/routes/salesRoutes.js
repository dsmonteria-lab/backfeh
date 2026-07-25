const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const salesController = '../controllers/salesController'; // Ajusta si la ruta relativa es diferente en tu estructura
const actualSalesController = require('../controllers/salesController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Todas las rutas requieren autenticación obligatoria
router.use(authenticateToken);

// Registrar venta - accesible para admin y vendedor (asociada al turno activo)
router.post(
  '/',
  [
    body('product_id').isInt().withMessage('ID de producto inválido'),
    body('galones').isFloat({ min: 0 }).withMessage('Los galones deben ser un valor positivo'),
    body('total_dinero').isFloat({ min: 0 }).withMessage('El total en dinero debe ser positivo'),
    body('metodo_pago').isIn(['efectivo', 'tarjeta', 'movil', 'transferencia']).withMessage('Método de pago no válido')
  ],
  validate, 
  actualSalesController.createSale
);

// Obtener ventas del usuario actual - accesible para admin y vendedor
router.get('/user', actualSalesController.getUserSales);

// Obtener todas las ventas del sistema - exclusivo para administradores
router.get('/', authorizeRole('admin'), actualSalesController.getAllSales);

// Actualizar venta - exclusivo para administradores
router.put('/:id', authorizeRole('admin'), actualSalesController.updateSale);

// Eliminar venta - exclusivo para administradores
router.delete('/:id', authorizeRole('admin'), actualSalesController.deleteSale);

// Estadísticas de Dashboard - exclusivo para administradores
router.get('/dashboard', authorizeRole('admin'), actualSalesController.getDashboardStats);

// Proyección de ventas - exclusivo para administradores
router.get('/forecast', authorizeRole('admin'), actualSalesController.getSalesForecast);

module.exports = router;