// models/Order.js
const db = require('../db');

const Order = {
  // Create orders table
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        courseId INT NOT NULL,
        razorpayOrderId VARCHAR(255) NOT NULL,
        razorpayPaymentId VARCHAR(255) DEFAULT NULL,
        razorpaySignature VARCHAR(255) DEFAULT NULL,
        amount INT NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        receipt VARCHAR(255) DEFAULT NULL,
        status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        FOREIGN KEY (courseId) REFERENCES courses(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create orders table:', err);
      } else {
        console.log('✅ Orders table ready.');
      }
    });
  },

  // Create new order
  create: (orderData, callback) => {
    const {
      userId,
      courseId,
      razorpayOrderId,
      amount,
      currency,
      receipt
    } = orderData;

    const sql = `
      INSERT INTO orders 
      (userId, courseId, razorpayOrderId, amount, currency, receipt)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [userId, courseId, razorpayOrderId, amount, currency, receipt], callback);
  },

  // Update order after payment success
  updatePaymentDetails: (id, paymentData, callback) => {
    const { razorpayPaymentId, razorpaySignature, status } = paymentData;
    const sql = `
      UPDATE orders SET 
        razorpayPaymentId = ?, 
        razorpaySignature = ?, 
        status = ?
      WHERE id = ?
    `;
    db.query(sql, [razorpayPaymentId, razorpaySignature, status, id], callback);
  },

  // Get order by Razorpay order ID
  getByRazorpayOrderId: (razorpayOrderId, callback) => {
    const sql = 'SELECT * FROM orders WHERE razorpayOrderId = ?';
    db.query(sql, [razorpayOrderId], callback);
  },

  // Get all orders of a user
  getByUserId: (userId, callback) => {
    const sql = 'SELECT * FROM orders WHERE userId = ? ORDER BY id DESC';
    db.query(sql, [userId], callback);
  },

  // Delete an order
  delete: (id, callback) => {
    const sql = 'DELETE FROM orders WHERE id = ?';
    db.query(sql, [id], callback);
  }
};

module.exports = Order;
