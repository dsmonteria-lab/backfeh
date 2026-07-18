const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email y contraseña son requeridos" 
      });
    }
    
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Credenciales inválidas" 
      });
    }
    
    if (!user.activo) {
      return res.status(403).json({ 
        success: false, 
        message: "Usuario desactivado. Contacte al administrador." 
      });
    }
    
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Credenciales inválidas" 
      });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol
        }
      }
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

module.exports = { login, getProfile };
