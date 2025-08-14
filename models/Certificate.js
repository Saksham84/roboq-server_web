const db = require('../db');

const Certificate = {
  // Create certificates table if it doesn't exist
  init: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        studentId INT NOT NULL,
        courseTitle VARCHAR(255) NOT NULL,
        courseCertificate VARCHAR(255) NOT NULL,
        dateIssued DATE NOT NULL,
        FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    db.query(sql, (err) => {
      if (err) {
        console.error('❌ Failed to create certificates table:', err);
      } else {
        console.log('✅ Certificates table ready or already exists.');
      }
    });
  },

  // Get all certificates
  getAll: (callback) => {
    const sql = 'SELECT * FROM certificates ORDER BY id DESC';
    db.query(sql, callback);
  },

  // Get certificate by ID
  getById: (id, callback) => {
    const sql = 'SELECT * FROM certificates WHERE id = ?';
    db.query(sql, [id], callback);
  },

  // Create new certificate
  create: (data, callback) => {
    const sql = `
      INSERT INTO certificates (studentId, courseTitle, courseCertificate, dateIssued)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [data.studentId, data.courseTitle, data.courseCertificate, data.dateIssued], callback);
  },

  // Update existing certificate
  update: (id, data, callback) => {
    const sql = `
      UPDATE certificates
      SET studentId = ?, courseTitle = ?, courseCertificate = ?, dateIssued = ?
      WHERE id = ?
    `;
    db.query(sql, [data.studentId, data.courseTitle, data.courseCertificate, data.dateIssued, id], callback);
  },

  // Delete certificate
  delete: (id, callback) => {
    const sql = 'DELETE FROM certificates WHERE id = ?';
    db.query(sql, [id], callback);
  }
};

module.exports = Certificate;
