const { Pool } = require('pg');
require('dotenv').config();

// Prioritize full DATABASE_URL if provided, otherwise use individual components.
const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      database: process.env.DB_NAME || 'eds_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Conexión exitosa a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err);
});

module.exports = pool;
