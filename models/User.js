const db = require('../db');

const User = {
  // ✅ Create users table if not exists
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatarUrl TEXT DEFAULT 'https://placehold.co/128x128.png',
        otp VARCHAR(6),
        otp_expiry DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create users table:', err);
      } else {
        console.log('✅ Users table ready or already exists.');
      }
    });
  },

  // 🔍 Find user by email
  findByEmail: (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    db.query(sql, [email], callback);
  },

  // ✅ Create user
  create: (name, email, password, role, callback) => {
    const sql = `
      INSERT INTO users (name, email, password, role, avatarUrl)
      VALUES (?, ?, ?, ?, ?)
    `;
    const defaultAvatar = 'https://placehold.co/128x128.png';
    db.query(sql, [name, email, password, role, defaultAvatar], callback);
  },

  // 📋 Get all users
  getAll: (callback) => {
    const sql = 'SELECT id, name, email, role, avatarUrl, created_at FROM users ORDER BY id DESC';
    db.query(sql, callback);
  },

  // ✏️ Update user (optional password update)
  update: (id, name, email, password, role, avatarUrl, callback) => {
    let sql = '';
    let values = [];

    if (password) {
      sql = `
        UPDATE users
        SET name = ?, email = ?, password = ?, role = ?, avatarUrl = ?
        WHERE id = ?
      `;
      values = [String(name), String(email), String(password), String(role), String(avatarUrl), Number(id)];
    } else {
      sql = `
        UPDATE users
        SET name = ?, email = ?, role = ?, avatarUrl = ?
        WHERE id = ?
      `;
      values = [String(name), String(email), String(role), String(avatarUrl), Number(id)];
    }

    db.query(sql, values, callback);
  },

  // ❌ Delete user
  delete: (id, callback) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [id], callback);
  },

  // 🔐 Set OTP and expiry for password reset
  setOtp: (email, otp, expiry, callback) => {
    const sql = 'UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?';
    db.query(sql, [otp, expiry, email], callback);
  },

  // 🔁 Reset password by email (and clear OTP)
  updatePasswordByEmail: (email, hashedPassword, callback) => {
    const sql = `
      UPDATE users
      SET password = ?, otp = NULL, otp_expiry = NULL
      WHERE email = ?
    `;
    db.query(sql, [hashedPassword, email], callback);
  },

  // 🔍 Get user by ID
  getById: (id, callback) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0]);
    });
  }
};

module.exports = User;
