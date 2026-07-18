const jwt = require("jsonwebtoken");

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Token de acceso no proporcionado" 
    });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: "Token inválido o expirado" 
      });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar rol
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Usuario no autenticado" 
      });
    }
    
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        success: false, 
        message: "No tiene permisos suficientes para realizar esta acción" 
      });
    }
    
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
