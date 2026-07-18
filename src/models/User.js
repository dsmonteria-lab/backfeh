const pool = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async create({ email, password, nombre, rol }) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nombre, rol) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, nombre, rol, activo, created_at`,
      [email, password_hash, nombre, rol]
    );
    return result.rows[0];
  }
  
  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT id, email, password_hash, nombre, rol, activo, created_at 
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  }
  
  static async findById(id) {
    const result = await pool.query(
      `SELECT id, email, nombre, rol, activo, created_at 
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }
  
  static async findAll() {
    const result = await pool.query(
      `SELECT id, email, nombre, rol, activo, created_at 
       FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }
  
  static async update(id, { nombre, rol, activo }) {
    const result = await pool.query(
      `UPDATE users 
       SET nombre = COALESCE($1, nombre), 
           rol = COALESCE($2, rol),
           activo = COALESCE($3, activo),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, nombre, rol, activo, created_at`,
      [nombre, rol, activo, id]
    );
    return result.rows[0];
  }
  
  static async updatePassword(id, password) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, nombre, rol`,
      [password_hash, id]
    );
    return result.rows[0];
  }
  
  static async delete(id) {
    await pool.query(`UPDATE users SET activo = false WHERE id = $1`, [id]);
  }
}

module.exports = User;
