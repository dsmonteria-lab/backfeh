const pool = require('../config/database'); // Ajusta según tu conexión a la base de datos

// 1. Consultar si el vendedor tiene un turno activo
const getActiveShift = async (req, res) => {
  try {
    const userId = req.user.id; // Obtenido del token JWT de autenticación

    const query = `
      SELECT * FROM shifts 
      WHERE user_id = $1 AND status = 'abierto' 
      ORDER BY start_time DESC LIMIT 1
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, data: null, message: "No hay turno activo" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error al obtener turno activo:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
};

// 2. Abrir un turno (o devolver el existente si ya está abierto)
const startShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lectura_inicial, product_id } = req.body;

    // Verificar si ya tiene un turno abierto (permite continuar desde otro dispositivo)
    const activeQuery = `
      SELECT * FROM shifts 
      WHERE user_id = $1 AND status = 'abierto' 
      ORDER BY start_time DESC LIMIT 1
    `;
    const activeResult = await pool.query(activeQuery, [userId]);

    if (activeResult.rows.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: "Ya existe un turno abierto", 
        data: activeResult.rows[0] 
      });
    }

    // Crear un nuevo turno
    const insertQuery = `
      INSERT INTO shifts (user_id, start_time, status) 
      VALUES ($1, CURRENT_TIMESTAMP, 'abierto') 
      RETURNING *
    `;
    const newShift = await pool.query(insertQuery, [userId]);
    const shift = newShift.rows[0];

    // Si se proveyó lectura_inicial, guardarla en mechanical_logs como registro de apertura.
    // lectura_final = lectura_inicial (aún no se han despachado galones en este turno).
    if (lectura_inicial !== undefined && lectura_inicial !== null && product_id) {
      const lecturaNum = parseFloat(lectura_inicial);
      if (!isNaN(lecturaNum)) {
        await pool.query(
          `INSERT INTO mechanical_logs 
            (user_id, shift_id, product_id, lectura_inicial, lectura_final,
             ventas_reportadas, descuadre, turno_inicio, turno_fin, observaciones)
           VALUES ($1, $2, $3, $4, $4, 0, false, $5, $5, 'Apertura de turno')`,
          [userId, shift.id, product_id, lecturaNum, shift.start_time]
        );
      }
    }

    return res.status(201).json({ 
      success: true, 
      message: "Turno abierto exitosamente", 
      data: shift
    });
  } catch (error) {
    console.error("Error al abrir turno:", error);
    return res.status(500).json({ success: false, message: "Error al iniciar el turno" });
  }
};

// 3. Cerrar el turno activo del vendedor
const closeShift = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shift_id, lectura_final, product_id, observaciones } = req.body;

    if (!shift_id || lectura_final === undefined) {
      return res.status(400).json({ success: false, message: "Faltan datos obligatorios (shift_id, lectura_final)" });
    }

    // Buscar el turno
    const shiftQuery = `SELECT * FROM shifts WHERE id = $1 AND user_id = $2 AND status = 'abierto'`;
    const shiftResult = await pool.query(shiftQuery, [shift_id, userId]);

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Turno activo no encontrado" });
    }

    const shift = shiftResult.rows[0];

    // Calcular las ventas en galones asociadas a este turno para este producto/surtidor
    const salesQuery = `
      SELECT COALESCE(SUM(galones), 0) as total_galones 
      FROM sales 
      WHERE shift_id = $1 AND user_id = $2
    `;
    const salesResult = await pool.query(salesQuery, [shift_id, userId]);
    const ventasReportadas = parseFloat(salesResult.rows[0].total_galones);

    // Obtener la lectura inicial del registro mecánico de este turno o del cierre anterior
    const mechanicalPrevQuery = `
      SELECT lectura_final FROM mechanical_logs 
      WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1
    `;
    const prevLog = await pool.query(mechanicalPrevQuery, [product_id || 1]);
    const lecturaInicial = prevLog.rows.length > 0 ? parseFloat(prevLog.rows[0].lectura_final) : 0;

    const finalNum = parseFloat(lectura_final);
    const diferenciaMecanica = finalNum - lecturaInicial;
    const descuadre = Math.abs(diferenciaMecanica - ventasReportadas) > 0.1;

    // Registrar en mechanical_logs
    const insertLogQuery = `
      INSERT INTO mechanical_logs (
        user_id, shift_id, product_id, lectura_inicial, lectura_final, 
        ventas_reportadas, descuadre, turno_inicio, turno_fin, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
      RETURNING *
    `;
    await pool.query(insertLogQuery, [
      userId, shift_id, product_id || 1, lecturaInicial, finalNum,
      ventasReportadas, descuadre, shift.start_time, observaciones || null
    ]);

    // Cerrar el turno en la tabla shifts
    const closeShiftQuery = `
      UPDATE shifts 
      SET end_time = CURRENT_TIMESTAMP, status = 'cerrado' 
      WHERE id = $1 
      RETURNING *
    `;
    const closedShift = await pool.query(closeShiftQuery, [shift_id]);

    return res.status(200).json({
      success: true,
      message: "Turno cerrado correctamente",
      data: {
        shift: closedShift.rows[0],
        resumen: {
          lecturaInicial,
          lecturaFinal: finalNum,
          ventasReportadas,
          diferenciaMecanica,
          descuadre
        }
      }
    });

  } catch (error) {
    console.error("Error al cerrar turno:", error);
    return res.status(500).json({ success: false, message: "Hubo un problema registrando el cierre de turno" });
  }
};

// 4. Obtener todos los turnos (para administración y filtrado)
const getAllShifts = async (req, res) => {
  try {
    const query = `
      SELECT s.*, u.nombre as vendedor_nombre 
      FROM shifts s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.start_time DESC LIMIT 100
    `;
    const result = await pool.query(query);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
};

// 5. Admin cierra forzosamente cualquier turno abierto
const adminCloseShift = async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Solo un administrador puede cerrar turnos de otros usuarios' });
    }

    const { shift_id, observaciones } = req.body;
    if (!shift_id) {
      return res.status(400).json({ success: false, message: 'shift_id es requerido' });
    }

    // Buscar el turno sin restricción de usuario
    const shiftQuery = `SELECT s.*, u.nombre as vendedor_nombre FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = $1 AND s.status = 'abierto'`;
    const shiftResult = await pool.query(shiftQuery, [shift_id]);

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Turno activo no encontrado' });
    }

    const closeQuery = `
      UPDATE shifts 
      SET end_time = CURRENT_TIMESTAMP, status = 'cerrado', observaciones_admin = $1
      WHERE id = $2
      RETURNING *
    `;
    // Si la columna observaciones_admin no existe, usar solo end_time y status
    let closedShift;
    try {
      closedShift = await pool.query(closeQuery, [
        `Cerrado por administrador (${req.user.nombre || 'admin'}). ${observaciones || ''}`.trim(),
        shift_id
      ]);
    } catch (colErr) {
      // Si la columna no existe, cierre sin observaciones_admin
      const simpleClose = await pool.query(
        `UPDATE shifts SET end_time = CURRENT_TIMESTAMP, status = 'cerrado' WHERE id = $1 RETURNING *`,
        [shift_id]
      );
      closedShift = simpleClose;
    }

    return res.status(200).json({
      success: true,
      message: `Turno del vendedor "${shiftResult.rows[0].vendedor_nombre}" cerrado por el administrador`,
      data: closedShift.rows[0]
    });
  } catch (error) {
    console.error('Error al cerrar turno (admin):', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = {
  getActiveShift,
  startShift,
  closeShift,
  getAllShifts,
  adminCloseShift
};