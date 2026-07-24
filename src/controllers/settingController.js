const Setting = require('../models/Setting');

// Get all settings (admin only)
const getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Update a setting (admin only)
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Valor es requerido'
      });
    }

    const updatedSetting = await Setting.set(key, String(value));
    
    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = { getAllSettings, updateSetting };
