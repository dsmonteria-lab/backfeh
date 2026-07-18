const pool = require("../config/database");

class Expense {
  static async create({ user_id, concepto, categoria, valor }) {
    const result = await pool.query(
      `INSERT INTO expenses (user_id, concepto, categoria, valor)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, concepto, categoria, valor]
    );
    return result.rows[0];
  }
  
  static async findByDateRange(startDate, endDate) {
    const result = await pool.query(
      `SELECT e.*, u.nombre as creado_por
       FROM expenses e
       JOIN users u ON e.user_id = u.id
       WHERE e.timestamp BETWEEN $1 AND $2
       ORDER BY e.timestamp DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }
  
  static async getTotalByDateRange(startDate, endDate) {
    const result = await pool.query(
      `SELECT SUM(valor) as total_gastos
       FROM expenses
       WHERE timestamp BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    return result.rows[0];
  }
  
  static async getByCategory(startDate, endDate) {
    const result = await pool.query(
      `SELECT categoria, SUM(valor) as total
       FROM expenses
       WHERE timestamp BETWEEN $1 AND $2
       GROUP BY categoria
       ORDER BY total DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }
}

module.exports = Expense;
