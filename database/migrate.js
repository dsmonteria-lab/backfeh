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
    
    await client.query(`CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      status VARCHAR(50) NOT NULL CHECK (status IN ('abierto', 'cerrado')),
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
      shift_id INTEGER REFERENCES shifts(id),
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
      shift_id INTEGER REFERENCES shifts(id),
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
    
    await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id)');
    await client.query('ALTER TABLE mechanical_logs ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shifts(id)');
    
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
    await client.query(`INSERT INTO settings (key, value) VALUES ('tolerancia_descuadre', '0.1') ON CONFLICT (key) DO NOTHING`);

    // --- MÓDULO DE SURTIDORES Y MANGUERAS ---
    await client.query(`CREATE TABLE IF NOT EXISTS dispensers (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      estado VARCHAR(50) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado', 'mantenimiento', 'bloqueado', 'pendiente_autorizacion')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER REFERENCES users(id)
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS hoses (
      id SERIAL PRIMARY KEY,
      dispenser_id INTEGER NOT NULL REFERENCES dispensers(id) ON DELETE CASCADE,
      posicion_codigo VARCHAR(50) NOT NULL,
      product_id INTEGER NOT NULL REFERENCES products(id),
      estado VARCHAR(50) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'inactiva', 'mantenimiento')),
      identificador_contador VARCHAR(100) NOT NULL,
      ultima_lectura_final_aceptada NUMERIC(12, 1) DEFAULT 0.0,
      digitos_enteros INTEGER DEFAULT 6,
      digitos_decimales INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS dispenser_openings (
      id SERIAL PRIMARY KEY,
      dispenser_id INTEGER NOT NULL REFERENCES dispensers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      fecha_cierre TIMESTAMP,
      estado VARCHAR(50) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada', 'en_conflicto')),
      observaciones TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS dispenser_opening_readings (
      id SERIAL PRIMARY KEY,
      opening_id INTEGER NOT NULL REFERENCES dispenser_openings(id) ON DELETE CASCADE,
      hose_id INTEGER NOT NULL REFERENCES hoses(id),
      lectura_inicial NUMERIC(12, 1) NOT NULL,
      lectura_final NUMERIC(12, 1),
      galones_mecanicos NUMERIC(12, 1),
      galones_registrados NUMERIC(12, 1),
      diferencia NUMERIC(12, 1),
      estado_conciliacion VARCHAR(50) DEFAULT 'pendiente' CHECK (estado_conciliacion IN ('pendiente', 'ok', 'descuadre', 'revisado')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS maintenance_logs (
      id SERIAL PRIMARY KEY,
      dispenser_id INTEGER NOT NULL REFERENCES dispensers(id),
      hose_id INTEGER REFERENCES hoses(id),
      tipo_evento VARCHAR(100) NOT NULL CHECK (tipo_evento IN ('mantenimiento_preventivo', 'reparacion', 'calibracion', 'reemplazo_contador', 'reinicio_contador')),
      contador_anterior NUMERIC(12, 1),
      contador_nuevo NUMERIC(12, 1),
      motivo TEXT NOT NULL,
      observaciones TEXT,
      registrado_por INTEGER NOT NULL REFERENCES users(id),
      autorizado_por INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      accion VARCHAR(100) NOT NULL,
      detalles JSONB,
      dispositivo_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Columnas adicionales en la tabla sales
    await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS dispenser_id INTEGER REFERENCES dispensers(id)');
    await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS hose_id INTEGER REFERENCES hoses(id)');
    await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS opening_id INTEGER REFERENCES dispenser_openings(id)');
    await client.query('ALTER TABLE sales ADD COLUMN IF NOT EXISTS uuid_offline VARCHAR(100) UNIQUE');

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
