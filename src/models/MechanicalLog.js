const pool = require('../config/database');

class MechanicalLog {
  static async create({ user_id, product_id, lectura_inicial, lectura_final, turno_inicio, turno_fin, observaciones }) {
    const result = await pool.query(
      'INSERT INTO mechanical_logs (user_id, product_id, lectura_inicial, lectura_final, turno_inicio, turno_fin, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user_id, product_id, lectura_inicial, lectura_final, turno_inicio, turno_fin, observaciones || '']
    );
    return result.rows[0];
  }
  
  static async findById(id) {
    const result = await pool.query('SELECT * FROM mechanical_logs WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  static async update(id, { lectura_inicial, lectura_final, observaciones }) {
    const result = await pool.query(
      'UPDATE mechanical_logs SET lectura_inicial = COALESCE($1, lectura_inicial), lectura_final = COALESCE($2, lectura_final), observaciones = COALESCE($3, observaciones), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [lectura_inicial, lectura_final, observaciones, id]
    );
    return result.rows[0];
  }
  
  static async delete(id) {
    await pool.query('UPDATE mechanical_logs SET deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }
  
  static async updateVentasReportadas(id, ventas_reportadas) {
    const result = await pool.query(
      'UPDATE mechanical_logs SET ventas_reportadas = $1, descuadre = ABS(diferencia_mecanica - $1) > 0.5, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [ventas_reportadas, id]
    );
    return result.rows[0];
  }
  
  static async findByTurno(turno_inicio, turno_fin) {
    const result = await pool.query(
      'SELECT ml.*, p.tipo_combustible, u.nombre FROM mechanical_logs ml JOIN products p ON ml.product_id = p.id JOIN users u ON ml.user_id = u.id WHERE ml.turno_inicio = $1 AND ml.turno_fin = $2 AND (ml.deleted IS NULL OR ml.deleted = false)',
      [turno_inicio, turno_fin]
    );
    return result.rows;
  }
  
  static async getAll(startDate, endDate) {
    const result = await pool.query(
      'SELECT ml.*, p.tipo_combustible, u.nombre as vendedor FROM mechanical_logs ml JOIN products p ON ml.product_id = p.id JOIN users u ON ml.user_id = u.id WHERE ml.turno_inicio BETWEEN $1 AND $2 AND (ml.deleted IS NULL OR ml.deleted = false) ORDER BY ml.turno_inicio DESC',
      [startDate, endDate]
    );
    return result.rows;
  }
  
  static async getLast() {
    const result = await pool.query(
      'SELECT ml.*, p.tipo_combustible, u.nombre as vendedor FROM mechanical_logs ml JOIN products p ON ml.product_id = p.id JOIN users u ON ml.user_id = u.id WHERE (ml.deleted IS NULL OR ml.deleted = false) ORDER BY ml.id DESC LIMIT 1'
    );
    return result.rows[0];
  }

  static async getDesCuadres(startDate, endDate) {
    const result = await pool.query(
      'SELECT ml.*, p.tipo_combustible, u.nombre as vendedor FROM mechanical_logs ml JOIN products p ON ml.product_id = p.id JOIN users u ON ml.user_id = u.id WHERE ml.descuadre = true AND ml.turno_inicio BETWEEN $1 AND $2 AND (ml.deleted IS NULL OR ml.deleted = false) ORDER BY ml.turno_inicio DESC',
      [startDate, endDate]
    );
    return result.rows;
  }
}

module.exports = MechanicalLog;