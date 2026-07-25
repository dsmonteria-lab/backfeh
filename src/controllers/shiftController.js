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

    return res.status(201).json({ 
      success: true, 
      message: "Turno abierto exitosamente", 
      data: newShift.rows[0] 
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
    // (Asumimos que recibes o consultas la lectura inicial con la que arrancó el turno)
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
        ventas_reportadas, diferencia_mecanica, descuadre, turno_inicio, turno_fin, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
      RETURNING *
    `;
    await pool.query(insertLogQuery, [
      userId, shift_id, product_id || 1, lecturaInicial, finalNum,
      ventasReportadas, diferenciaMecanica, descuadre, shift.start_time, observaciones || null
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

module.exports = {
  getActiveShift,
  startShift,
  closeShift
};