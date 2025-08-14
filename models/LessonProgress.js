const db = require('../db');

const LessonProgress = {
  // ✅ Create the lesson_progress table if it doesn't exist
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enrollment_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_progress (enrollment_id, lesson_id)
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create lesson_progress table:', err);
      } else {
        console.log('✅ lesson_progress table is ready or already exists.');
      }
    });
  },

  // ✅ Mark a lesson as completed
  markCompleted: (enrollmentId, lessonId, callback) => {
    const sql = `
      INSERT INTO lesson_progress (enrollment_id, lesson_id, completed, completed_at)
      VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        completed = TRUE,
        completed_at = CURRENT_TIMESTAMP
    `;
    db.query(sql, [enrollmentId, lessonId], (err, result) => {
      if (err) {
        console.error('❌ Failed to mark lesson completed:', err);
        return callback(err);
      }
      callback(null, result);
    });
  },

  // ✅ Get all lesson progress by enrollment ID
  getProgress: (enrollmentId, callback) => {
    const sql = `
      SELECT 
        lp.id, 
        lp.lesson_id, 
        lp.completed, 
        lp.completed_at, 
        l.title
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE lp.enrollment_id = ?
    `;
    db.query(sql, [enrollmentId], (err, results) => {
      if (err) {
        console.error('❌ Failed to fetch lesson progress:', err);
        return callback(err);
      }
      callback(null, results);
    });
  }
};

module.exports = LessonProgress;
