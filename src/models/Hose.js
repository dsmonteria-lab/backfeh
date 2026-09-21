const pool = require('../config/database');

class Hose {
  static async create({ dispenser_id, posicion_codigo, product_id, identificador_contador, ultima_lectura_final_aceptada = 0, digitos_enteros = 6, digitos_decimales = 1 }) {
    const result = await pool.query(
      `INSERT INTO hoses (dispenser_id, posicion_codigo, product_id, identificador_contador, ultima_lectura_final_aceptada, digitos_enteros, digitos_decimales)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [dispenser_id, posicion_codigo, product_id, identificador_contador, ultima_lectura_final_aceptada, digitos_enteros, digitos_decimales]
    );
    return result.rows[0];
  }

  static async findByDispenser(dispenser_id) {
    const result = await pool.query(
      `SELECT h.*, p.nombre as producto_nombre, p.tipo_combustible, p.precio_venta
       FROM hoses h
       JOIN products p ON h.product_id = p.id
       WHERE h.dispenser_id = $1
       ORDER BY h.id ASC`,
      [dispenser_id]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT h.*, p.nombre as producto_nombre, p.tipo_combustible, p.precio_venta, d.codigo as dispenser_codigo, d.estado as dispenser_estado
       FROM hoses h
       JOIN products p ON h.product_id = p.id
       JOIN dispensers d ON h.dispenser_id = d.id
       WHERE h.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, { posicion_codigo, product_id, estado, identificador_contador, digitos_enteros, digitos_decimales }) {
    const result = await pool.query(
      `UPDATE hoses
       SET posicion_codigo = COALESCE($1, posicion_codigo),
           product_id = COALESCE($2, product_id),
           estado = COALESCE($3, estado),
           identificador_contador = COALESCE($4, identificador_contador),
           digitos_enteros = COALESCE($5, digitos_enteros),
           digitos_decimales = COALESCE($6, digitos_decimales),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [posicion_codigo, product_id, estado, identificador_contador, digitos_enteros, digitos_decimales, id]
    );
    return result.rows[0];
  }

  static async updateLastReading(id, nuevaLectura) {
    const result = await pool.query(
      `UPDATE hoses
       SET ultima_lectura_final_aceptada = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [nuevaLectura, id]
    );
    return result.rows[0];
  }

  static async updateStatus(id, estado) {
    const result = await pool.query(
      `UPDATE hoses
       SET estado = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  }
}

module.exports = Hose;
