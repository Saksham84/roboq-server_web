// server/db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "mysql.railway.internal" || process.env.HOST,
  user: "root" || process.env.USER,
  password: "qajvozjPAZxEMwEtypajOYeEaXSQhLYi"||process.env.PASSWORD, // Update if needed
  database: "railway"||process.env.DATABASE // Your database name
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database.');
  }
});

module.exports = db;
