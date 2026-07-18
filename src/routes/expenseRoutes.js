const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const expenseController = require("../controllers/expenseController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Crear gasto - solo admin
router.post(
  "/",
  [
    body("concepto").notEmpty().withMessage("Concepto requerido"),
    body("categoria").notEmpty().withMessage("Categoría requerida"),
    body("valor").isFloat({ min: 0 }).withMessage("Valor debe ser positivo")
  ],
  authorizeRole("admin"),
  expenseController.createExpense
);

// Obtener gastos - solo admin
router.get("/", authorizeRole("admin"), expenseController.getExpenses);

module.exports = router;
