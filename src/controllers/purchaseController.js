const Purchase = require('../models/Purchase');

// Registrar compra (solo admin)
exports.createPurchase = async (req, res) => {
  try {
    const { supplier, invoice_number, total_amount, product_id, quantity } = req.body;
    if (!supplier || !invoice_number || !total_amount || !product_id || !quantity) {
      return res.status(400).json({ success: false, message: 'Campos requeridos faltan' });
    }

    const purchase = await Purchase.create({
      supplier,
      invoice_number,
      total_amount,
      product_id,
      quantity,
    });

    res.status(201).json({ success: true, data: purchase, message: 'Compra registrada' });
  } catch (error) {
    console.error('Error creando compra:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Obtener todas las compras (admin)
exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.findAll();
    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Error obteniendo compras:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
