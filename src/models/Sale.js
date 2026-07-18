const pool = require('../config/database');

class Sale {
  static async create({ user_id, product_id, galones, total_dinero, metodo_pago, dispositivo_id }) {
    const result = await pool.query(
      'INSERT INTO sales (user_id, product_id, galones, total_dinero, metodo_pago, dispositivo_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, product_id, galones, total_dinero, metodo_pago, dispositivo_id]
    );
    return result.rows[0];
  }
  
  static async findById(id) {
    const result = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  static async update(id, { galones, total_dinero, metodo_pago, product_id }) {
    const result = await pool.query(
      'UPDATE sales SET galones = COALESCE($1, galones), total_dinero = COALESCE($2, total_dinero), metodo_pago = COALESCE($3, metodo_pago), product_id = COALESCE($4, product_id), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [galones, total_dinero, metodo_pago, product_id, id]
    );
    return result.rows[0];
  }
  
  static async delete(id) {
    await pool.query('UPDATE sales SET deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }
  
  static async findByUserAndDateRange(user_id, startDate, endDate) {
    const result = await pool.query(
      'SELECT s.*, p.nombre as producto_nombre, p.tipo_combustible, u.nombre as vendedor_nombre FROM sales s JOIN products p ON s.product_id = p.id JOIN users u ON s.user_id = u.id WHERE s.user_id = $1 AND s.timestamp BETWEEN $2 AND $3 AND (s.deleted IS NULL OR s.deleted = false) ORDER BY s.timestamp DESC',
      [user_id, startDate, endDate]
    );
    return result.rows;
  }
  
  static async getSalesByDateRange(startDate, endDate) {
    const result = await pool.query(
      'SELECT s.*, p.nombre as producto_nombre, p.tipo_combustible, p.costo_compra, p.precio_venta, u.nombre as vendedor_nombre FROM sales s JOIN products p ON s.product_id = p.id JOIN users u ON s.user_id = u.id WHERE s.timestamp BETWEEN $1 AND $2 AND (s.deleted IS NULL OR s.deleted = false) ORDER BY s.timestamp DESC',
      [startDate, endDate]
    );
    return result.rows;
  }
  
  static async getDashboardStats(startDate, endDate) {
    const result = await pool.query(
      'SELECT COUNT(*) as total_ventas, SUM(total_dinero) as total_vendido, SUM(galones) as total_galones, SUM((p.precio_venta - p.costo_compra) * s.galones) as utilidad_neta FROM sales s JOIN products p ON s.product_id = p.id WHERE s.timestamp BETWEEN $1 AND $2 AND (s.deleted IS NULL OR s.deleted = false)',
      [startDate, endDate]
    );
    return result.rows[0];
  }
  
  static async getSalesByProduct(startDate, endDate) {
    const result = await pool.query(
      'SELECT p.tipo_combustible, SUM(s.galones) as galones_vendidos, SUM(s.total_dinero) as total_vendido, SUM((p.precio_venta - p.costo_compra) * s.galones) as utilidad FROM sales s JOIN products p ON s.product_id = p.id WHERE s.timestamp BETWEEN $1 AND $2 AND (s.deleted IS NULL OR s.deleted = false) GROUP BY p.tipo_combustible',
      [startDate, endDate]
    );
    return result.rows;
  }
}

module.exports = Sale;
