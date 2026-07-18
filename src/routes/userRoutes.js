const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Todas las rutas requieren autenticación y rol admin
router.use(authenticateToken);
router.use(authorizeRole("admin"));

router.get("/", userController.getAllUsers);

router.post(
  "/",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").isLength({ min: 6 }).withMessage("Contraseña debe tener al menos 6 caracteres"),
    body("nombre").notEmpty().withMessage("Nombre requerido"),
    body("rol").isIn(["admin", "vendedor"]).withMessage("Rol inválido")
  ],
  validate, userController.createUser
);

router.put(
  "/:id",
  [
    body("nombre").optional().notEmpty(),
    body("rol").optional().isIn(["admin", "vendedor"])
  ],
  userController.updateUser
);

router.delete("/:id", userController.deleteUser);

module.exports = router;
