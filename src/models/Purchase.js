const pool = require('../config/database');

class Purchase {
  // Register a new purchase and increase product stock
  static async create({ supplier, invoice_number, total_amount, product_id, quantity }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert purchase record
      const purchaseResult = await client.query(
        `INSERT INTO purchases (supplier, invoice_number, total_amount, product_id, quantity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [supplier, invoice_number, total_amount, product_id, quantity]
      );

      // Increase product stock
      await client.query(
        `UPDATE products
         SET stock_actual = stock_actual + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [quantity, product_id]
      );

      await client.query('COMMIT');
      return purchaseResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // List all purchases (admin view)
  static async findAll() {
    const result = await pool.query(
      `SELECT pu.*, p.nombre AS product_name, p.tipo_combustible
       FROM purchases pu
       JOIN products p ON pu.product_id = p.id
       ORDER BY pu.created_at DESC`
    );
    return result.rows;
  }
}

module.exports = Purchase;
