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
    
    await client.query(`COMMIT`);
    console.log("Datos iniciales creados exitosamente");
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
