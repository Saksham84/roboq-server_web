const db = require('../db');

const Lesson = {
  // Create lessons table with course_id foreign key
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        videoUrl TEXT NOT NULL,
        course_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create lessons table:', err);
      } else {
        console.log('✅ Lessons table ready.');
      }
    });
  },

  // Get all lessons with course title
  getAll: (callback) => {
    const sql = `
      SELECT lessons.*, courses.title AS courseTitle
      FROM lessons
      JOIN courses ON lessons.course_id = courses.id
      ORDER BY lessons.id DESC
    `;
    db.query(sql, callback);
  },

  // Get lessons by course ID (NEW)
  getByCourseId: (courseId, callback) => {
    const sql = 'SELECT * FROM lessons WHERE course_id = ? ORDER BY id ASC';
    db.query(sql, [courseId], callback);
  },

  // Get single lesson by ID
  getById: (id, callback) => {
    const sql = 'SELECT * FROM lessons WHERE id = ?';
    db.query(sql, [id], callback);
  },

  // Create a new lesson
  create: (lesson, callback) => {
    const { title, duration, content, videoUrl, course_id } = lesson;
    const sql = `
      INSERT INTO lessons (title, duration, content, videoUrl, course_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sql, [title, duration, content, videoUrl, course_id], callback);
  },

  // Update an existing lesson
  update: (id, lesson, callback) => {
    const { title, duration, content, videoUrl, course_id } = lesson;
    const sql = `
      UPDATE lessons SET
        title = ?, duration = ?, content = ?, videoUrl = ?, course_id = ?
      WHERE id = ?
    `;
    db.query(sql, [title, duration, content, videoUrl, course_id, id], callback);
  },

  // Delete a lesson
  delete: (id, callback) => {
    const sql = 'DELETE FROM lessons WHERE id = ?';
    db.query(sql, [id], callback);
  }
};

module.exports = Lesson;
