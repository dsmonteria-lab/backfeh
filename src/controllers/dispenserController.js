const Dispenser = require('../models/Dispenser');
const Hose = require('../models/Hose');
const DispenserOpening = require('../models/DispenserOpening');
const MaintenanceLog = require('../models/MaintenanceLog');
const AuditLog = require('../models/AuditLog');
const Setting = require('../models/Setting');
const pool = require('../config/database');

// --- SURTIDORES ---

const getDispensers = async (req, res) => {
  try {
    const activosOnly = req.query.activos_solo === 'true';
    const dispensers = await Dispenser.findAll(activosOnly);
    res.json({ success: true, data: dispensers });
  } catch (error) {
    console.error('Error al obtener surtidores:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const createDispenser = async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    if (!codigo || !nombre) {
      return res.status(400).json({ success: false, message: 'Código y nombre son obligatorios' });
    }

    const dispenser = await Dispenser.create({ codigo, nombre, created_by: req.user.id });
    await AuditLog.log({ user_id: req.user.id, accion: 'CREAR_SURTIDOR', detalles: { id: dispenser.id, codigo, nombre } });

    res.status(201).json({ success: true, message: 'Surtidor creado exitosamente', data: dispenser });
  } catch (error) {
    console.error('Error al crear surtidor:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

const updateDispenser = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, estado } = req.body;
    const updated = await Dispenser.update(id, { codigo, nombre, estado });
    await AuditLog.log({ user_id: req.user.id, accion: 'ACTUALIZAR_SURTIDOR', detalles: { id, codigo, nombre, estado } });
    res.json({ success: true, message: 'Surtidor actualizado exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar surtidor:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// --- MANGUERAS / POSICIONES ---

const getHosesByDispenser = async (req, res) => {
  try {
    const { dispenser_id } = req.params;
    const hoses = await Hose.findByDispenser(dispenser_id);
    res.json({ success: true, data: hoses });
  } catch (error) {
    console.error('Error al obtener mangueras:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const createHose = async (req, res) => {
  try {
    const { dispenser_id, posicion_codigo, product_id, identificador_contador, ultima_lectura_final_aceptada, digitos_enteros, digitos_decimales } = req.body;
    if (!dispenser_id || !posicion_codigo || !product_id || !identificador_contador) {
      return res.status(400).json({ success: false, message: 'Datos requeridos de manguera faltantes' });
    }

    const hose = await Hose.create({
      dispenser_id,
      posicion_codigo,
      product_id,
      identificador_contador,
      ultima_lectura_final_aceptada: ultima_lectura_final_aceptada !== undefined ? parseFloat(ultima_lectura_final_aceptada) : 0,
      digitos_enteros: digitos_enteros || 6,
      digitos_decimales: digitos_decimales !== undefined ? digitos_decimales : 1
    });

    await AuditLog.log({ user_id: req.user.id, accion: 'CREAR_MANGUERA', detalles: { id: hose.id, dispenser_id, posicion_codigo, product_id } });
    res.status(201).json({ success: true, message: 'Manguera configurada exitosamente', data: hose });
  } catch (error) {
    console.error('Error al crear manguera:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

const updateHose = async (req, res) => {
  try {
    const { id } = req.params;
    const { posicion_codigo, product_id, estado, identificador_contador, digitos_enteros, digitos_decimales } = req.body;
    
    // Solo administrador puede cambiar el producto o estado de la manguera
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un administrador puede modificar mangueras' });
    }

    const updated = await Hose.update(id, { posicion_codigo, product_id, estado, identificador_contador, digitos_enteros, digitos_decimales });
    await AuditLog.log({ user_id: req.user.id, accion: 'ACTUALIZAR_MANGUERA', detalles: { id, posicion_codigo, product_id, estado } });

    res.json({ success: true, message: 'Manguera actualizada exitosamente', data: updated });
  } catch (error) {
    console.error('Error al actualizar manguera:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// --- APERTURAS ---

const getActiveOpening = async (req, res) => {
  try {
    const { dispenser_id } = req.params;
    const opening = await DispenserOpening.getActiveByDispenser(dispenser_id);
    if (!opening) {
      return res.json({ success: true, data: null, message: 'No hay apertura activa para este surtidor' });
    }
    const readings = await DispenserOpening.getReadingsByOpening(opening.id);
    res.json({ success: true, data: { ...opening, lecturas: readings } });
  } catch (error) {
    console.error('Error obteniendo apertura activa:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const startDispenserOpening = async (req, res) => {
  try {
    const { dispenser_id, lecturas, observaciones } = req.body;
    if (!dispenser_id || !Array.isArray(lecturas) || lecturas.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe especificar el surtidor y las lecturas de todas sus mangueras' });
    }

    const opening = await DispenserOpening.createOpeningWithReadings({
      dispenser_id,
      user_id: req.user.id,
      lecturas,
      observaciones
    });

    await AuditLog.log({ user_id: req.user.id, accion: 'APERTURA_SURTIDOR', detalles: { opening_id: opening.id, dispenser_id, lecturas } });

    res.status(201).json({ success: true, message: 'Apertura de surtidor registrada exitosamente', data: opening });
  } catch (error) {
    console.error('Error en apertura de surtidor:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const closeDispenserOpening = async (req, res) => {
  try {
    const { opening_id, lecturas_finales, observaciones } = req.body;
    if (!opening_id || !Array.isArray(lecturas_finales) || lecturas_finales.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar la apertura y las lecturas finales' });
    }

    let tolerancia = 0.1;
    try {
      const dbTol = await Setting.get('tolerancia_descuadre');
      if (dbTol) tolerancia = parseFloat(dbTol);
    } catch (e) {}

    const result = await DispenserOpening.closeOpeningWithReadings({
      opening_id,
      lecturas_finales,
      tolerancia,
      observaciones
    });

    await AuditLog.log({ user_id: req.user.id, accion: 'CIERRE_SURTIDOR', detalles: result });

    res.json({ success: true, message: 'Cierre de surtidor registrado', data: result });
  } catch (error) {
    console.error('Error en cierre de surtidor:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- MANTENIMIENTOS & AUTORIZACIONES ---

const registerMaintenance = async (req, res) => {
  try {
    const { dispenser_id, hose_id, tipo_evento, contador_anterior, contador_nuevo, motivo, observaciones } = req.body;

    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo los administradores pueden registrar mantenimientos o cambios de contador' });
    }

    if (!dispenser_id || !tipo_evento || !motivo) {
      return res.status(400).json({ success: false, message: 'Surtidor, tipo de evento y motivo son requeridos' });
    }

    const log = await MaintenanceLog.create({
      dispenser_id,
      hose_id,
      tipo_evento,
      contador_anterior,
      contador_nuevo,
      motivo,
      observaciones,
      registrado_por: req.user.id,
      autorizado_por: req.user.id
    });

    await AuditLog.log({ user_id: req.user.id, accion: 'REGISTRO_MANTENIMIENTO', detalles: log });

    res.status(201).json({ success: true, message: 'Mantenimiento o cambio de contador registrado exitosamente', data: log });
  } catch (error) {
    console.error('Error al registrar mantenimiento:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

const authorizeReturnToService = async (req, res) => {
  try {
    const { dispenser_id, motivo } = req.body;
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un administrador puede autorizar el retorno al servicio' });
    }

    const dispenser = await Dispenser.findById(dispenser_id);
    if (!dispenser) {
      return res.status(404).json({ success: false, message: 'Surtidor no encontrado' });
    }

    await Dispenser.updateStatus(dispenser_id, 'activo');
    await AuditLog.log({ user_id: req.user.id, accion: 'RETORNO_AL_SERVICIO', detalles: { dispenser_id, motivo } });

    res.json({ success: true, message: 'Surtidor habilitado nuevamente para el servicio' });
  } catch (error) {
    console.error('Error autorizando retorno al servicio:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    const logs = await AuditLog.findRecent(100);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error consultando auditoría:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const deleteDispenser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un administrador puede eliminar surtidores' });
    }
    const deleted = await Dispenser.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Surtidor no encontrado' });
    }
    await AuditLog.log({ user_id: req.user.id, accion: 'ELIMINAR_SURTIDOR', detalles: { id } });
    res.json({ success: true, message: 'Surtidor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar surtidor:', error);
    res.status(400).json({ success: false, message: error.message || 'Error al eliminar surtidor' });
  }
};

const toggleDispenserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un administrador puede cambiar el estado de un surtidor' });
    }
    
    // CORRECCIÓN: Alinear los estados permitidos con la base de datos de Neon
    if (!['activo', 'cerrado', 'mantenimiento', 'bloqueado', 'pendiente_autorizacion'].includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido. Use un estado permitido por el sistema.' });
    }
    
    const updated = await Dispenser.updateStatus(id, estado);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Surtidor no encontrado' });
    }
    await AuditLog.log({ user_id: req.user.id, accion: 'CAMBIAR_ESTADO_SURTIDOR', detalles: { id, estado } });
    res.json({ success: true, message: `Estado del surtidor actualizado a ${estado} exitosamente`, data: updated });
  } catch (error) {
    console.error('Error al cambiar estado del surtidor:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

module.exports = {
  getDispensers,
  createDispenser,
  updateDispenser,
  deleteDispenser,
  toggleDispenserStatus,
  getHosesByDispenser,
  createHose,
  updateHose,
  getActiveOpening,
  startDispenserOpening,
  closeDispenserOpening,
  registerMaintenance,
  authorizeReturnToService,
  getAuditLogs
};