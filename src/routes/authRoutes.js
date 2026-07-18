const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("Contraseña requerida")
  ],
  authController.login
);

router.get("/profile", authenticateToken, authController.getProfile);

module.exports = router;
