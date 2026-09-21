const pool = require('../config/database');

class Dispenser {
  static async create({ codigo, nombre, created_by }) {
    const result = await pool.query(
      `INSERT INTO dispensers (codigo, nombre, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [codigo, nombre, created_by]
    );
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query(
      `SELECT d.*, u.nombre as creado_por_nombre,
              COUNT(h.id)::int as total_mangueras
       FROM dispensers d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN hoses h ON h.dispenser_id = d.id
       GROUP BY d.id, u.nombre
       ORDER BY d.id ASC`
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT d.*, u.nombre as creado_por_nombre
       FROM dispensers d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, estado) {
    const result = await pool.query(
      `UPDATE dispensers
       SET estado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  }

  static async update(id, { codigo, nombre, estado }) {
    const result = await pool.query(
      `UPDATE dispensers
       SET codigo = COALESCE($1, codigo),
           nombre = COALESCE($2, nombre),
           estado = COALESCE($3, estado),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [codigo, nombre, estado, id]
    );
    return result.rows[0];
  }
}

module.exports = Dispenser;
