const pool = require('../src/config/database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'vendedor')),
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      tipo_combustible VARCHAR(50) NOT NULL CHECK (tipo_combustible IN ('Combustible', 'Lubricante', 'Accesorios')),
      costo_compra DECIMAL(10, 2) NOT NULL DEFAULT 0,
      precio_venta DECIMAL(10, 2) NOT NULL DEFAULT 0,
      stock_actual DECIMAL(10, 2) DEFAULT 0,
      stock_minimo DECIMAL(10, 2) DEFAULT 200,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      galones DECIMAL(10, 2) NOT NULL,
      total_dinero DECIMAL(10, 2) NOT NULL,
      metodo_pago VARCHAR(50) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'movil', 'transferencia')),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sincronizado BOOLEAN DEFAULT true,
      dispositivo_id VARCHAR(100),
      deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS mechanical_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      lectura_inicial DECIMAL(10, 2) NOT NULL,
      lectura_final DECIMAL(10, 2) NOT NULL,
      diferencia_mecanica DECIMAL(10, 2) GENERATED ALWAYS AS (lectura_final - lectura_inicial) STORED,
      ventas_reportadas DECIMAL(10, 2) DEFAULT 0,
      descuadre BOOLEAN DEFAULT false,
      turno_inicio TIMESTAMP NOT NULL,
      turno_fin TIMESTAMP NOT NULL,
      observaciones TEXT,
      deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      concepto VARCHAR(255) NOT NULL,
      categoria VARCHAR(100) NOT NULL,
      valor DECIMAL(10, 2) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tipo_combustible_check');
    await client.query(`
      UPDATE products
      SET tipo_combustible = 'Combustible', updated_at = CURRENT_TIMESTAMP
      WHERE tipo_combustible IN ('Gasolina', 'ACPM')
    `);
    await client.query(`
      ALTER TABLE products
      ADD CONSTRAINT products_tipo_combustible_check
      CHECK (tipo_combustible IN ('Combustible', 'Lubricante', 'Accesorios'))
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mechanical_logs_turno ON mechanical_logs(turno_inicio, turno_fin)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON expenses(timestamp)');
    
    await client.query(`CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

    await client.query(`CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    await client.query(`INSERT INTO settings (key, value) VALUES ('meta_galones', '1500') ON CONFLICT (key) DO NOTHING`);

await client.query('COMMIT');
    console.log('Tablas creadas exitosamente');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando tablas:', error);
    throw error;
  } finally {
    client.release();
  }
};

createTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
