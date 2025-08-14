const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Lesson = require('../models/Lesson');

// Ensure table exists
Lesson.init();

// Set up video upload folder
const videoDir = path.join(__dirname, '../assets/videos');
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, videoDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage });

// GET all lessons
router.get('/', (req, res) => {
  Lesson.getAll((err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch lessons' });
    res.json(results);
  });
});

// POST create lesson with video
router.post('/', upload.single('video'), (req, res) => {
  const { title, duration, content, course_id } = req.body;
  const videoUrl = req.file ? `/assets/videos/${req.file.filename}` : '';

  if (!title || !duration || !content || !videoUrl || !course_id) {
    return res.status(400).json({ error: 'All fields including video and course are required' });
  }

  const lesson = { title, duration, content, videoUrl, course_id };

  Lesson.create(lesson, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to create lesson' });
    res.status(201).json({ message: 'Lesson created', id: result.insertId });
  });
});

// PUT update lesson with optional video upload
router.put('/:id', upload.single('video'), (req, res) => {
  const { id } = req.params;

  Lesson.getById(id, (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const existing = rows[0];
    const { title, duration, content, course_id } = req.body;
    let videoUrl = existing.videoUrl;

    if (!title || !duration || !content || !course_id) {
      return res.status(400).json({ error: 'All fields except video are required' });
    }

    // Replace old video if new one uploaded
    if (req.file) {
      videoUrl = `/assets/videos/${req.file.filename}`;
      const oldPath = path.join(__dirname, '..', existing.videoUrl || '');
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updatedLesson = { title, duration, content, videoUrl, course_id };

    Lesson.update(id, updatedLesson, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update lesson' });
      res.json({ message: 'Lesson updated' });
    });
  });
});

// DELETE lesson and its video
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  Lesson.getById(id, (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = rows[0];

    Lesson.delete(id, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete lesson' });

      const videoPath = path.join(__dirname, '..', lesson.videoUrl || '');
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

      res.json({ message: 'Lesson deleted' });
    });
  });
});

module.exports = router;
