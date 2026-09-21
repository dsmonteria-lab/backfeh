const pool = require('../config/database');

class AuditLog {
  static async log({ user_id, accion, detalles, dispositivo_id = 'web' }) {
    try {
      const result = await pool.query(
        `INSERT INTO audit_logs (user_id, accion, detalles, dispositivo_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id || null, accion, detalles ? JSON.stringify(detalles) : null, dispositivo_id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error guardando registro de auditoría:', error);
    }
  }

  static async findRecent(limit = 100) {
    const result = await pool.query(
      `SELECT al.*, u.nombre as usuario_nombre
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }
}

module.exports = AuditLog;
