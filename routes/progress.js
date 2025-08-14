const express = require('express');
const router = express.Router();
const LessonProgress = require('../models/LessonProgress');
const Enrollment = require('../models/Enrollment');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ POST /api/progress/complete
router.post('/complete', authMiddleware, (req, res) => {
  const userId = req.user?.id;
  const { courseId, lessonId } = req.body;

  if (!userId || !courseId || !lessonId) {
    return res.status(400).json({ error: 'Missing userId, courseId, or lessonId' });
  }

  // Step 1: Get enrollmentId using userId and courseId
  Enrollment.getEnrollmentId(userId, courseId, (err, enrollmentId) => {
    if (err) {
      console.error('❌ Failed to get enrollment ID:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!enrollmentId) {
      return res.status(400).json({ error: 'User is not enrolled in this course' });
    }

    // Step 2: Mark lesson completed
    LessonProgress.markCompleted(enrollmentId, lessonId, (err) => {
      if (err) {
        console.error('❌ Error marking lesson complete:', err);
        return res.status(500).json({ error: 'Could not mark lesson as completed' });
      }

      res.json({
        success: true,
        message: 'Lesson marked as completed',
        completedLessonId: lessonId,
      });
    });
  });
});

// ✅ GET /api/progress/:courseId
router.get('/:courseId', authMiddleware, (req, res) => {
  if (!req.isLoggedIn || !req.user) {
    return res.json({ isLoggedIn: false, enrollmentId: null, });
  }

  const userId = req.user?.id;
  const { courseId } = req.params;

  if (!userId || !courseId) {
    return res.status(400).json({ error: 'Missing userId or courseId' });
  }

  Enrollment.getEnrollmentId(userId, courseId, (err, enrollmentId) => {
    if (err) {
      console.error('❌ Failed to get enrollment ID:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // ✅ User is not enrolled
    if (!enrollmentId) {
      return res.json({
        enrollmentId: null,
        completedLessonIds: [],
      });
    }

    // ✅ User is enrolled
    LessonProgress.getProgress(enrollmentId, (err, progress) => {
      if (err) {
        console.error('❌ Error fetching lesson progress:', err);
        return res.status(500).json({ error: 'Could not fetch progress data' });
      }

      const completedLessonIds = progress
        .filter((entry) => entry.completed)
        .map((entry) => entry.lesson_id.toString());

      return res.json({
        enrollmentId,
        completedLessonIds,
      });
    });
  });
});

module.exports = router;
