const Sale = require('../models/Sale');
const Product = require('../models/Product');
const MechanicalLog = require('../models/MechanicalLog');
const Setting = require('../models/Setting');
const pool = require('../config/db'); // Importante para la consulta directa de turnos

// Registrar venta asociada al turno activo
const createSale = async (req, res) => {
  try {
    const { product_id, galones, total_dinero, metodo_pago, dispositivo_id } = req.body;
    const userId = req.user.id;

    // Use explicit null checks — values like 0 are valid and must not be rejected
    if (product_id == null || galones == null || total_dinero == null || !metodo_pago) {
      return res.status(400).json({
        success: false,
        message: `Campos requeridos faltantes: ${
          [product_id == null && 'product_id', galones == null && 'galones', total_dinero == null && 'total_dinero', !metodo_pago && 'metodo_pago']
            .filter(Boolean).join(', ')
        }`
      });
    }

    if (parseFloat(galones) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad de galones debe ser mayor a 0'
      });
    }
    
    // 1. Verificar que el vendedor tenga un turno abierto activo
    const shiftQuery = `
      SELECT id FROM shifts 
      WHERE user_id = $1 AND status = 'abierto' 
      ORDER BY start_time DESC LIMIT 1
    `;
    const shiftResult = await pool.query(shiftQuery, [userId]);

    if (shiftResult.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes registrar ventas sin un turno abierto.' 
      });
    }

    const shiftId = shiftResult.rows[0].id;

    const product = await Product.findById(product_id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    // Actualizar stock
    await Product.updateStock(product_id, galones);
    
    // 2. Crear la venta incluyendo el shift_id
    const sale = await Sale.create({
      user_id: userId,
      shift_id: shiftId,
      product_id,
      galones,
      total_dinero,
      metodo_pago,
      dispositivo_id: dispositivo_id || 'web'
    });
    
    res.status(201).json({
      success: true,
      message: 'Venta registrada exitosamente',
      data: sale
    });
  } catch (error) {
    console.error('Error registrando venta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener ventas del usuario (por fecha)
const getUserSales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    
    const sales = await Sale.findByUserAndDateRange(req.user.id, start, end);
    
    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener todas las ventas (solo admin)
const getAllSales = async (req, res) => {
  try {
    const { startDate, endDate, user_id, shift_id } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    
    const sales = await Sale.getSalesByDateRange(start, end);
    
    // Filtrar por usuario o por turno si se especifica
    let filteredSales = sales;
    if (user_id) {
      filteredSales = filteredSales.filter(s => s.user_id === parseInt(user_id));
    }
    if (shift_id) {
      filteredSales = filteredSales.filter(s => s.shift_id === parseInt(shift_id));
    }
    
    res.json({
      success: true,
      data: filteredSales
    });
  } catch (error) {
    console.error('Error obteniendo ventas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Actualizar venta (solo admin)
const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { galones, total_dinero, metodo_pago, product_id } = req.body;
    
    const sale = await Sale.findById(id);
    
    if (!sale) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta no encontrada' 
      });
    }
    
    // Si cambia el producto, ajustar stock
    if (product_id && product_id !== sale.product_id) {
      await Product.updateStock(sale.product_id, -parseFloat(sale.galones));
      await Product.updateStock(product_id, parseFloat(galones || sale.galones));
    } else if (galones && galones !== sale.galones) {
      const diferencia = parseFloat(galones) - parseFloat(sale.galones);
      await Product.updateStock(sale.product_id, diferencia);
    }
    
    const updatedSale = await Sale.update(id, {
      galones: galones || sale.galones,
      total_dinero: total_dinero || sale.total_dinero,
      metodo_pago: metodo_pago || sale.metodo_pago,
      product_id: product_id || sale.product_id
    });
    
    res.json({
      success: true,
      message: 'Venta actualizada exitosamente',
      data: updatedSale
    });
  } catch (error) {
    console.error('Error actualizando venta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Eliminar venta (solo admin - soft delete)
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findById(id);
    
    if (!sale) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta no encontrada' 
      });
    }
    
    await Product.updateStock(sale.product_id, -parseFloat(sale.galones));
    await Sale.delete(id);
    
    res.json({
      success: true,
      message: 'Venta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando venta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener dashboard stats (solo admin)
const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    
    const stats = await Sale.getDashboardStats(start, end);
    const salesByProduct = await Sale.getSalesByProduct(start, end);
    const expenses = await require('../models/Expense').getTotalByDateRange(start, end);
    
    let metaGalones = 1500;
    try {
      const dbMeta = await Setting.get('meta_galones');
      if (dbMeta) {
        metaGalones = parseFloat(dbMeta) || 1500;
      }
    } catch(e) {
      console.error('Error fetching meta_galones setting:', e);
    }

    const totalGalones = parseFloat(stats.total_galones) || 0;
    const progresoMeta = (totalGalones / metaGalones) * 100;
    
    res.json({
      success: true,
      data: {
        total_ventas: parseInt(stats.total_ventas) || 0,
        total_vendido: parseFloat(stats.total_vendido) || 0,
        total_galones: totalGalones,
        utilidad_neta: parseFloat(stats.utilidad_neta) || 0,
        total_gastos: parseFloat(expenses.total_gastos) || 0,
        utilidad_bruta: parseFloat(stats.utilidad_neta) || 0,
        progreso_meta: Math.min(progresoMeta, 100),
        meta_galones: metaGalones,
        ventas_por_producto: salesByProduct
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

// Obtener proyección de ventas
const getSalesForecast = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    
    const stats = await Sale.getDashboardStats(start, end);
    
    const diasTranscurridos = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const totalGalones = parseFloat(stats.total_galones) || 0;
    const ventaDiariaPromedio = totalGalones / diasTranscurridos;
    const estimadoMensual = ventaDiariaPromedio * 30;
    
    res.json({
      success: true,
      data: {
        venta_diaria_promedio: parseFloat(ventaDiariaPromedio.toFixed(2)),
        estimado_mensual: parseFloat(estimadoMensual.toFixed(2)),
        dias_transcurridos: diasTranscurridos,
        total_galones_periodo: totalGalones
      }
    });
  } catch (error) {
    console.error('Error obteniendo proyección:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
};

module.exports = { createSale, getUserSales, getAllSales, updateSale, deleteSale, getDashboardStats, getSalesForecast };