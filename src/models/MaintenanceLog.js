const pool = require('../config/database');

class MaintenanceLog {
  static async create({ dispenser_id, hose_id, tipo_evento, contador_anterior, contador_nuevo, motivo, observaciones, registrado_por, autorizado_por }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO maintenance_logs 
          (dispenser_id, hose_id, tipo_evento, contador_anterior, contador_nuevo, motivo, observaciones, registrado_por, autorizado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [dispenser_id, hose_id || null, tipo_evento, contador_anterior || null, contador_nuevo || null, motivo, observaciones || null, registrado_por, autorizado_por || null]
      );

      const log = result.rows[0];

      // Si es mantenimiento_preventivo, reparacion o calibración que afecta al surtidor completo, actualizar su estado a 'mantenimiento'
      if (['mantenimiento_preventivo', 'reparacion'].includes(tipo_evento)) {
        await client.query("UPDATE dispensers SET estado = 'mantenimiento', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [dispenser_id]);
      }

      // Si es reemplazo o reinicio de contador y se especifica hose_id y contador_nuevo
      if (['reemplazo_contador', 'reinicio_contador'].includes(tipo_evento) && hose_id && contador_nuevo !== undefined && contador_nuevo !== null) {
        await client.query(
          "UPDATE hoses SET ultima_lectura_final_aceptada = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [contador_nuevo, hose_id]
        );
      }

      await client.query('COMMIT');
      return log;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByDispenser(dispenser_id) {
    const result = await pool.query(
      `SELECT ml.*, u1.nombre as registrado_por_nombre, u2.nombre as autorizado_por_nombre, h.posicion_codigo
       FROM maintenance_logs ml
       JOIN users u1 ON ml.registrado_por = u1.id
       LEFT JOIN users u2 ON ml.autorizado_por = u2.id
       LEFT JOIN hoses h ON ml.hose_id = h.id
       WHERE ml.dispenser_id = $1
       ORDER BY ml.created_at DESC`,
      [dispenser_id]
    );
    return result.rows;
  }
}

module.exports = MaintenanceLog;
