const MechanicalLog = require('../models/MechanicalLog');
const Sale = require('../models/Sale');
const pool = require('../config/database');

// Registrar lectura mecánica solo para combustibles
const createMechanicalLog = async (req, res) => {
  try {
    const { product_id, lectura_inicial, lectura_final, turno_inicio, turno_fin, observaciones } = req.body;
    
    if (!product_id || lectura_inicial === undefined || lectura_inicial === null || lectura_final === undefined || lectura_final === null || !turno_inicio || !turno_fin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Verificamos que el producto sea efectivamente un combustible
    const productCheck = await pool.query('SELECT tipo_combustible FROM products WHERE id = $1', [product_id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    
    const tipo = (productCheck.rows[0].tipo_combustible || '').toLowerCase();
    const esCombustible = ['combustible', 'gasolina', 'acpm', 'diesel'].some(t => tipo.includes(t));
    
    if (!esCombustible) {
      return res.status(400).json({
        success: false,
        message: 'Los accesorios y lubricantes no tienen contador mecánico ni aplican para cierre de turno.'
      });
    }
    
    const log = await MechanicalLog.create({
      user_id: req.user.id,
      product_id,
      lectura_inicial,
      lectura_final,
      turno_inicio,
      turno_fin,
      observaciones: observaciones || ''
    });
    
    // Calcular ventas reportadas solo para este combustible en el rango
    const ventasReportadas = await Sale.findByUserAndDateRange(req.user.id, turno_inicio, turno_fin);
    const ventasFiltradas = ventasReportadas.filter(v => Number(v.product_id) === Number(product_id));
    const totalGalones = ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.galones || 0), 0);
    
    await MechanicalLog.updateVentasReportadas(log.id, totalGalones);
    
    res.status(201).json({
      success: true,
      message: 'Registro mecánico de combustible creado exitosamente',
      data: log
    });
  } catch (error) {
    console.error('Error creando registro mecánico:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

const getMechanicalLogsByTurno = async (req, res) => {
  try {
    const { turno_inicio, turno_fin } = req.query;
    if (!turno_inicio || !turno_fin) {
      return res.status(400).json({ success: false, message: 'Las fechas de turno son requeridas' });
    }
    const logs = await MechanicalLog.findByTurno(turno_inicio, turno_fin);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error obteniendo registros mecánicos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getAllMechanicalLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    const logs = await MechanicalLog.getAll(start, end);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error obteniendo registros mecánicos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const updateMechanicalLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { lectura_inicial, lectura_final, observaciones } = req.body;
    const log = await MechanicalLog.findById(id);
    
    if (!log) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    
    const updatedLog = await MechanicalLog.update(id, {
      lectura_inicial: lectura_inicial !== undefined ? lectura_inicial : log.lectura_inicial,
      lectura_final: lectura_final !== undefined ? lectura_final : log.lectura_final,
      observaciones: observaciones !== undefined ? observaciones : log.observaciones
    });
    
    const ventasReportadas = await Sale.findByUserAndDateRange(log.user_id, log.turno_inicio, log.turno_fin);
    const ventasFiltradas = ventasReportadas.filter(v => Number(v.product_id) === Number(log.product_id));
    const totalGalones = ventasFiltradas.reduce((sum, v) => sum + parseFloat(v.galones || 0), 0);
    
    await MechanicalLog.updateVentasReportadas(updatedLog.id, totalGalones);
    
    res.json({ success: true, message: 'Registro actualizado exitosamente', data: updatedLog });
  } catch (error) {
    console.error('Error actualizando registro mecánico:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const deleteMechanicalLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await MechanicalLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    await MechanicalLog.delete(id);
    res.json({ success: true, message: 'Registro eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando registro:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getDesCuadres = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    const descuadres = await MechanicalLog.getDesCuadres(start, end);
    res.json({ success: true, data: descuadres });
  } catch (error) {
    console.error('Error obteniendo descuadres:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getLastShiftLog = async (req, res) => {
  try {
    const log = await MechanicalLog.getLast();
    res.json({ success: true, data: log || null });
  } catch (error) {
    console.error('Error obteniendo último registro:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { 
  createMechanicalLog, 
  getMechanicalLogsByTurno, 
  getAllMechanicalLogs,
  updateMechanicalLog,
  deleteMechanicalLog,
  getDesCuadres,
  getLastShiftLog
};