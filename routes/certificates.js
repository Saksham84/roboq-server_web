const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db'); // Make sure db connection is accessible here
const Certificate = require('../models/Certificate');
const authMiddleware = require('../middleware/authMiddleware');

// Init table
Certificate.init();

// Upload config
const uploadDir = path.join(__dirname, '../assets/certificates');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// GET all certificates (with student name)
router.get('/', (req, res) => {
  const query = `
    SELECT c.*, u.name AS studentName
    FROM certificates c
    LEFT JOIN users u ON c.studentId = u.id
  `;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch certificates' });
    res.json(rows);
  });
});

//get user certificate
router.get('/user', authMiddleware, (req, res) => {
  if (!req.isLoggedIn || !req.user?.id) {
    return res.status(200).json({ isLoggedIn: false });
  }

  const userId = req.user.id;

  const query = `
    SELECT c.*, u.name AS studentName
    FROM certificates c
    LEFT JOIN users u ON c.studentId = u.id
    WHERE c.studentId = ?
  `;

  db.query(query, [userId], (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch certificates:", err);
      return res.status(500).json({ error: 'Failed to fetch certificates' });
    }

    res.json(rows);
  });
});

// POST new certificate (with image)
router.post('/', upload.single('courseCertificate'), (req, res) => {
  const { studentId, courseTitle, dateIssued } = req.body;

  if (!studentId || !courseTitle || !dateIssued || !req.file) {
    return res.status(400).json({ error: 'All fields are required including image and student' });
  }

  const courseCertificate = `/assets/certificates/${req.file.filename}`;
  Certificate.create({ studentId, courseTitle, dateIssued, courseCertificate }, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to create certificate' });
    res.status(201).json({ message: 'Certificate created', id: result.insertId });
  });
});

// PUT update certificate (with optional image)
router.put('/:id', upload.single('courseCertificate'), (req, res) => {
  const id = req.params.id;
  const { studentId, courseTitle, dateIssued } = req.body;

  if (!studentId || !courseTitle || !dateIssued) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  Certificate.getById(id, (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const existing = rows[0];
    let courseCertificate = existing.courseCertificate;

    if (req.file) {
      courseCertificate = `/assets/certificates/${req.file.filename}`;
      const oldPath = path.join(__dirname, '..', existing.courseCertificate || '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    Certificate.update(id, { studentId, courseTitle, dateIssued, courseCertificate }, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update certificate' });
      res.json({ message: 'Certificate updated' });
    });
  });
});

// DELETE certificate (also delete image)
router.delete('/:id', (req, res) => {
  const id = req.params.id;

  Certificate.getById(id, (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certificate = rows[0];

    Certificate.delete(id, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete certificate' });

      const filePath = path.join(__dirname, '..', certificate.courseCertificate || '');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({ message: 'Certificate deleted' });
    });
  });
});

module.exports = router;
