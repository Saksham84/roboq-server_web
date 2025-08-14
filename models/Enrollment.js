const db = require('../db');

const Enrollment = {
  // Create the enrollments table
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_enrollment (user_id, course_id)
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create enrollments table:', err);
      } else {
        console.log('✅ Enrollments table ready or already exists.');
      }
    });
  },

  // Enroll a user in a course and create lesson progress
  enroll: (userId, courseId, callback) => {
    const sql = `
      INSERT IGNORE INTO enrollments (user_id, course_id)
      VALUES (?, ?)
    `;

    db.query(sql, [userId, courseId], (err, result) => {
      if (err) return callback(err);
      if (result.affectedRows === 0) {
        return callback(null, { message: 'User already enrolled' });
      }

      // Get the inserted enrollment ID
      const getEnrollmentIdSql = `
        SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?
      `;
      db.query(getEnrollmentIdSql, [userId, courseId], (err, rows) => {
        if (err) return callback(err);

        const enrollmentId = rows[0]?.id;
        if (!enrollmentId) return callback(new Error('Enrollment ID not found'));

        // Get all lessons for the course
        const getLessonsSql = `
          SELECT id FROM lessons WHERE course_id = ?
        `;
        db.query(getLessonsSql, [courseId], (err, lessons) => {
          if (err) return callback(err);

          if (!lessons.length) {
            return callback(null, { message: 'Enrolled, but no lessons to track.' });
          }

          // Insert lesson progress for each lesson
          const progressValues = lessons.map(lesson => `(${enrollmentId}, ${lesson.id})`).join(", ");
          const insertProgressSql = `
            INSERT IGNORE INTO lesson_progress (enrollment_id, lesson_id)
            VALUES ${progressValues}
          `;

          db.query(insertProgressSql, (err) => {
            if (err) return callback(err);
            callback(null, { message: 'Enrollment and lesson progress created' });
          });
        });
      });
    });
  },

  // ✅ NEW: Get enrollment ID by user and course
  getEnrollmentId: (userId, courseId, callback) => {
    const sql = `
      SELECT id FROM enrollments
      WHERE user_id = ? AND course_id = ?
      LIMIT 1
    `;
    db.query(sql, [userId, courseId], (err, results) => {
      if (err) return callback(err);
      if (results.length === 0) return callback(null, null);
      callback(null, results[0].id);
    });
  },

  // Get courses a user is enrolled in
  getEnrolledCoursesByUser: (userId, callback) => {
    const sql = `
      SELECT c.*
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `;
    db.query(sql, [userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  // Get users enrolled in a course
  getEnrolledUsersByCourse: (courseId, callback) => {
    const sql = `
      SELECT u.*
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = ?
      ORDER BY e.enrolled_at DESC
    `;
    db.query(sql, [courseId], (err, results) => {
      if (err) return callback(err);
      callback(null, results);
    });
  },

  // Check if user is already enrolled
  isEnrolled: (userId, courseId, callback) => {
    const sql = `
      SELECT 1 FROM enrollments
      WHERE user_id = ? AND course_id = ?
      LIMIT 1
    `;
    db.query(sql, [userId, courseId], (err, results) => {
      if (err) return callback(err);
      callback(null, results.length > 0);
    });
  },

  // Unenroll a user from a course
  unenroll: (userId, courseId, callback) => {
    const sql = `
      DELETE FROM enrollments
      WHERE user_id = ? AND course_id = ?
    `;
    db.query(sql, [userId, courseId], (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  },
};

module.exports = Enrollment;
