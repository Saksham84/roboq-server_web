// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const db = require("../db"); // adjust path if needed

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    req.isLoggedIn = false;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    if (!userId) {
      req.isLoggedIn = false;
      return next();
    }

    const query = "SELECT id, name, email, role, avatarUrl FROM users WHERE id = ?";
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        req.isLoggedIn = false;
        return next();
      }

      if (results.length === 0) {
        req.isLoggedIn = false;
        return next();
      }

      req.user = results[0];        // Full user info from DB
      req.isLoggedIn = true;
      next();
    });
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    req.isLoggedIn = false;
    return next();
  }
};

module.exports = authMiddleware;
