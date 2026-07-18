const User = require("../models/User");

// Obtener todos los usuarios (solo admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

// Crear usuario (solo admin)
const createUser = async (req, res) => {
  try {
    const { email, password, nombre, rol } = req.body;
    
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({ 
        success: false, 
        message: "Todos los campos son requeridos" 
      });
    }
    
    if (!["admin", "vendedor"].includes(rol)) {
      return res.status(400).json({ 
        success: false, 
        message: "Rol inválido. Debe ser 'admin' o 'vendedor'" 
      });
    }
    
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: "El email ya está registrado" 
      });
    }
    
    const user = await User.create({ email, password, nombre, rol });
    
    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: user
    });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

// Actualizar usuario (solo admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rol, activo } = req.body;
    
    const user = await User.update(id, { nombre, rol, activo });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }
    
    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: user
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

// Eliminar usuario (solo admin - soft delete)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: "No puedes eliminar tu propio usuario" 
      });
    }
    
    await User.delete(id);
    
    res.json({
      success: true,
      message: "Usuario eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
