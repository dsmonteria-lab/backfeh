const Expense = require("../models/Expense");

// Crear gasto
const createExpense = async (req, res) => {
  try {
    const { concepto, categoria, valor } = req.body;
    
    if (!concepto || !categoria || !valor) {
      return res.status(400).json({ 
        success: false, 
        message: "Todos los campos son requeridos" 
      });
    }
    
    const expense = await Expense.create({
      user_id: req.user.id,
      concepto,
      categoria,
      valor
    });
    
    res.status(201).json({
      success: true,
      message: "Gasto registrado exitosamente",
      data: expense
    });
  } catch (error) {
    console.error("Error registrando gasto:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

// Obtener gastos por rango de fechas
const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0,0,0,0));
    const end = endDate ? new Date(endDate) : new Date();
    
    const expenses = await Expense.findByDateRange(start, end);
    const byCategory = await Expense.getByCategory(start, end);
    
    res.json({
      success: true,
      data: {
        expenses,
        byCategory
      }
    });
  } catch (error) {
    console.error("Error obteniendo gastos:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
};

module.exports = { createExpense, getExpenses };
