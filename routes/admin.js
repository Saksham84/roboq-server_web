const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db'); // Your MySQL connection
const setAuthToken = require('../utils/setAuthToken');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ Admin Login Route
router.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE name = ? LIMIT 1';
  db.query(query, [name], async (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Server error.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: not an admin.' });
    }

    setAuthToken(res, user);
    res.json({
      message: 'Admin login successful',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  });
});

// ✅ Admin Profile Route (to verify admin session)
router.get('/profile', authMiddleware, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.json({isLoggedIn: false})
  }

  return res.json({
    isLoggedIn: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
