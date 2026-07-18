const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./logger');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const salesRoutes = require('./routes/salesRoutes');
const mechanicalRoutes = require('./routes/mechanicalRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const productsRoutes = require('./routes/productsRoutes');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger using Winston
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/mechanical', mechanicalRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/products', productsRoutes);

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EDS Francisco el Hombre API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// Start server only when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('========================================');
    logger.info('  EDS Francisco el Hombre - Backend');
    logger.info(`  Puerto: ${PORT}`);
    logger.info(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
    logger.info('========================================');
  });
}

module.exports = app;
