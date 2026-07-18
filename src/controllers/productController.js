const Product = require("../models/Product");
const pool = require('../config/database');

// Admin: get all products (including hidden)
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

// Vendor: get only visible products
exports.getVisibleProducts = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE visible_para_vendedor = true');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updatedProduct = await Product.update(id, data);


    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.json({ success: true, data: updatedProduct, message: "Producto actualizado" });
  } catch (error) {
    next(error);
  }
};

// Admin: toggle product visibility for vendors
exports.toggleVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { visible_para_vendedor } = req.body;
    const result = await pool.query(
      `UPDATE products SET visible_para_vendedor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [visible_para_vendedor, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }
    res.json({ success: true, data: result.rows[0], message: "Visibilidad actualizada" });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { nombre, tipo_combustible, costo_compra, precio_venta, stock_minimo, codigo_barras } = req.body;

    const newProduct = await Product.create({
      nombre,
      tipo_combustible,
      costo_compra,
      precio_venta,
      stock_minimo,
      codigo_barras: codigo_barras || null,
    });

    res.status(201).json({ success: true, data: newProduct, message: "Producto creado exitosamente" });
  } catch (error) {
    next(error);
  }
};
