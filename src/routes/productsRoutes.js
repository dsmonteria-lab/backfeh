const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const productController = require("../controllers/productController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

// Public visible products for vendors (requires authentication but no admin role)
router.get("/visible", authenticateToken, productController.getVisibleProducts);

// Admin-protected routes
router.use(authenticateToken);
router.use(authorizeRole("admin"));

router.get("/", productController.getAllProducts);

router.post(
  "/",
  [
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("tipo_combustible").notEmpty().withMessage("Categoría requerida"),
    body("costo_compra").isNumeric().withMessage("Debe ser numérico"),
    body("precio_venta").isNumeric().withMessage("Debe ser numérico"),
    body("stock_minimo").isNumeric().withMessage("Debe ser numérico"),
    body("codigo_barras").optional().isString().withMessage("Código de barras inválido")
  ],
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  [
    body('nombre').optional().isString().withMessage('Nombre debe ser string'),
    body('tipo_combustible').optional().isString().withMessage('Tipo combustible debe ser string'),
    body('costo_compra').optional().isNumeric().withMessage('Costo debe ser numérico'),
    body('precio_venta').optional().isNumeric().withMessage('Precio debe ser numérico'),
    body('stock_actual').optional().isNumeric().withMessage('Stock actual debe ser numérico'),
    body('stock_minimo').optional().isNumeric().withMessage('Stock minimo debe ser numérico'),
    body('codigo_barras').optional().isString().withMessage('Código de barras debe ser string')
  ],
  validate,
  productController.updateProduct
);

router.patch(
  "/:id/visibility",
  [
    body("visible_para_vendedor").isBoolean().withMessage("Debe ser booleano")
  ],
  validate,
  productController.toggleVisibility
);
module.exports = router;
