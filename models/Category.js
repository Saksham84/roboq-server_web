const db = require('../db');

const Category = {
  // Create categories table
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE
      )
    `;
    db.query(sql, (err) => {
      if (err) console.error('❌ Error creating categories table:', err);
      else console.log('✅ Categories table ready.');
    });
  },

  // Get all categories
  getAll: (callback) => {
    db.query('SELECT * FROM categories ORDER BY name ASC', callback);
  },

  // Create a new category
  create: ({ name, slug }, callback) => {
    const sql = 'INSERT INTO categories (name, slug) VALUES (?, ?)';
    db.query(sql, [name, slug], callback);
  },

  // Update a category by id
  update: (id, { name, slug }, callback) => {
    const sql = 'UPDATE categories SET name = ?, slug = ? WHERE id = ?';
    db.query(sql, [name, slug, id], callback);
  },

  // Delete a category by id
  delete: (id, callback) => {
    const sql = 'DELETE FROM categories WHERE id = ?';
    db.query(sql, [id], callback);
  }
};

module.exports = Category;
