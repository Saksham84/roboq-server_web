const db = require('../db');

const Course = {
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        longDescription TEXT,
        instructor VARCHAR(255),
        imageUrl TEXT,
        imageHint TEXT,
        category_id INT,
        tags TEXT,
        price DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `;
    db.query(sql, (err) => {
      if (err) console.error('❌ Failed to create courses table:', err);
      else console.log('✅ Courses table ready or already exists.');
    });
  },

  getAll: (callback) => {
    const sql = `
      SELECT 
        c.*, 
        cat.name AS category_name,
        cat.slug AS category_slug 
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.id DESC
    `;
    db.query(sql, callback);
  },

  getById: (id, callback) => {
    const sql = `
      SELECT 
        c.*, 
        cat.name AS category_name,
        cat.slug AS category_slug 
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.id = ?
    `;
    db.query(sql, [id], callback);
  },

  create: (course, callback) => {
    const {
      title,
      description,
      longDescription,
      instructor,
      imageUrl,
      imageHint,
      category_id,
      tags,
      price
    } = course;

    const sql = `
      INSERT INTO courses (
        title, description, longDescription, instructor,
        imageUrl, imageHint, category_id, tags, price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      description,
      longDescription,
      instructor,
      imageUrl,
      imageHint,
      category_id || null,
      JSON.stringify(tags),
      price
    ];

    db.query(sql, values, callback);
  },

  update: (id, course, callback) => {
    const {
      title,
      description,
      longDescription,
      instructor,
      imageUrl,
      imageHint,
      category_id,
      tags,
      price
    } = course;

    const sql = `
      UPDATE courses SET
        title = ?, description = ?, longDescription = ?, instructor = ?,
        imageUrl = ?, imageHint = ?, category_id = ?, tags = ?, price = ?
      WHERE id = ?
    `;

    const values = [
      title,
      description,
      longDescription,
      instructor,
      imageUrl,
      imageHint,
      category_id || null,
      JSON.stringify(tags),
      price,
      id
    ];

    db.query(sql, values, callback);
  },

  delete: (id, callback) => {
    const sql = 'DELETE FROM courses WHERE id = ?';
    db.query(sql, [id], callback);
  }
};

module.exports = Course;
