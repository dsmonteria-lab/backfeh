const pool = require("../config/database");

class Product {
  static async findAll() {
    const result = await pool.query(
      `SELECT * FROM products ORDER BY tipo_combustible`
    );
    return result.rows;
  }
  
  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }
  
  static async create({ nombre, tipo_combustible, costo_compra, precio_venta, stock_minimo, codigo_barras = null, visible_para_vendedor = true }) {
    const result = await pool.query(
      `INSERT INTO products (nombre, tipo_combustible, costo_compra, precio_venta, stock_actual, stock_minimo, codigo_barras, visible_para_vendedor)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7)
       RETURNING *`,
      [nombre, tipo_combustible, costo_compra, precio_venta, stock_minimo, codigo_barras, visible_para_vendedor]
    );
    return result.rows[0];
  }
  
  static async update(id, data) {
    const result = await pool.query(
      `UPDATE products 
        SET nombre = COALESCE($2, nombre),
            tipo_combustible = COALESCE($3, tipo_combustible),
            costo_compra = COALESCE($4, costo_compra),
            precio_venta = COALESCE($5, precio_venta),
            stock_actual = COALESCE($6, stock_actual),
            stock_minimo = COALESCE($7, stock_minimo),
            codigo_barras = $8,
            visible_para_vendedor = COALESCE($9, visible_para_vendedor),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
      [
        id,
        data.nombre,
        data.tipo_combustible,
        data.costo_compra,
        data.precio_venta,
        data.stock_actual,
        data.stock_minimo,
        data.codigo_barras || null,
        data.visible_para_vendedor
      ]
    );
    return result.rows[0];
  }
  
  static async updateStock(id, galones) {
    const result = await pool.query(
      `UPDATE products 
       SET stock_actual = stock_actual - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [galones, id]
    );
    return result.rows[0];
  }

  // Increase stock (e.g., after a purchase)
  static async increaseStock(id, galones) {
    const result = await pool.query(
      `UPDATE products 
        SET stock_actual = stock_actual + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *`,
      [galones, id]
    );
    return result.rows[0];
  }
  
  static async getLowStock() {
    const result = await pool.query(
      `SELECT * FROM products WHERE stock_actual < stock_minimo`
    );
    return result.rows;
  }
}

module.exports = Product;
