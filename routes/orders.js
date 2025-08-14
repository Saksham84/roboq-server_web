// routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Get all orders
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM orders ORDER BY created_at DESC';
  require('../db').query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results);
  });
});

// Delete order
router.delete('/:id', (req, res) => {
  Order.delete(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ message: 'Order deleted successfully' });
  });
});

module.exports = router;
