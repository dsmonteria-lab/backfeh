const pool = require('../config/database');

class Setting {
  static async get(key) {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows.length > 0 ? result.rows[0].value : null;
  }

  static async set(key, value) {
    const result = await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP RETURNING *',
      [key, value]
    );
    return result.rows[0];
  }

  static async getAll() {
    const result = await pool.query('SELECT * FROM settings');
    return result.rows;
  }
}

module.exports = Setting;
