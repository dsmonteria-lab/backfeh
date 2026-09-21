const pool = require("../src/config/database");
const bcrypt = require("bcryptjs");

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query(`BEGIN`);
    
    // Hash para la contraseña del admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    const vendedorPassword = await bcrypt.hash("vendedor123", 10);
    
    // Crear usuario admin
    await client.query(`
      INSERT INTO users (email, password_hash, nombre, rol, activo)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO NOTHING
    `, ["admin@eds.com", adminPassword, "Administrador", "admin"]);
    
    // Crear usuario vendedor de ejemplo
    await client.query(`
      INSERT INTO users (email, password_hash, nombre, rol, activo)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email) DO NOTHING
    `, ["vendedor@eds.com", vendedorPassword, "Juan Pérez", "vendedor"]);
    
    // Normalizar categorías legacy (Gasolina/ACPM → Combustible)
    await client.query(`
      UPDATE products
      SET tipo_combustible = 'Combustible', updated_at = CURRENT_TIMESTAMP
      WHERE tipo_combustible IN ('Gasolina', 'ACPM')
    `);

    // Crear productos si no existen
    const productsCheck = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(productsCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO products (nombre, tipo_combustible, costo_compra, precio_venta, stock_actual, stock_minimo)
        VALUES 
          ('Gasolina Corriente', 'Combustible', 18500, 22000, 5000, 200),
          ('ACPM', 'Combustible', 17000, 20500, 3000, 200)
      `);
    }
    
    // Crear surtidor principal y mangueras si no existen
    const dispenserCheck = await client.query('SELECT COUNT(*) FROM dispensers');
    if (parseInt(dispenserCheck.rows[0].count) === 0) {
      const dispRes = await client.query(`
        INSERT INTO dispensers (codigo, nombre, estado, created_by)
        VALUES ('SURT-01', 'Surtidor Principal (2 Mangueras)', 'activo', 1)
        RETURNING id
      `);
      const dispId = dispRes.rows[0].id;

      // Buscar productos de combustible
      const prodCorriente = await client.query("SELECT id FROM products WHERE LOWER(nombre) LIKE '%corriente%' OR LOWER(nombre) LIKE '%gasolina%' LIMIT 1");
      const prodAcpm = await client.query("SELECT id FROM products WHERE LOWER(nombre) LIKE '%acpm%' OR LOWER(nombre) LIKE '%diesel%' LIMIT 1");

      const idCorriente = prodCorriente.rows[0]?.id || 1;
      const idAcpm = prodAcpm.rows[0]?.id || 2;

      await client.query(`
        INSERT INTO hoses (dispenser_id, posicion_codigo, product_id, identificador_contador, ultima_lectura_final_aceptada, digitos_enteros, digitos_decimales)
        VALUES 
          ($1, 'Manguera 1 (Gasolina Corriente)', $2, 'CONT-M1-CORRIENTE', 0.0, 6, 1),
          ($1, 'Manguera 2 (ACPM)', $3, 'CONT-M2-ACPM', 0.0, 6, 1)
      `, [dispId, idCorriente, idAcpm]);
    }
    
    await client.query(`COMMIT`);
    console.log("Datos iniciales y surtidores creados exitosamente");
    console.log("\nUsuarios creados:");
    console.log("  Admin: admin@eds.com / admin123");
    console.log("  Vendedor: vendedor@eds.com / vendedor123");
    
  } catch (error) {
    await client.query(`ROLLBACK`);
    console.error("Error creando datos iniciales:", error);
    throw error;
  } finally {
    client.release();
  }
};

seedData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
