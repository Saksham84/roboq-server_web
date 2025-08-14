const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Course = require('../models/Course');
const authMiddleware = require('../middleware/authMiddleware');
const Enrollment = require('../models/Enrollment');

// Ensure table exists
Course.init();

// Multer setup
const uploadDir = path.join(__dirname, '../assets/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// GET all courses
router.get('/', (req, res) => {
  Course.getAll((err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch courses' });

    const courses = results.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      longDescription: course.longDescription,
      instructor: course.instructor,
      imageUrl: course.imageUrl,
      imageHint: course.imageHint,
      tags: course.tags ? JSON.parse(course.tags) : [],
      price: course.price,
      created_at: course.created_at,
      category: {
        id: course.category_id,
        name: course.category_name,
        slug: course.category_slug
      }
    }));

    res.json(courses);
  });
});

// ✅ GET enrolled courses for logged-in user (move this before :id route)
router.get('/enrolled', authMiddleware, (req, res) => {
//   console.log('✅ /enrolled route hit');

  if (!req.isLoggedIn || !req.user) {
    return res.json({ isLoggedIn: false });
  }
  const userId = req.user.id;

  Enrollment.getEnrolledCoursesByUser(userId, (err, courses) => {
    if (err) {
      console.error('❌ Failed to fetch enrolled courses:', err);
      return res.status(500).json({ error: 'Failed to fetch enrolled courses' });
    }

    const formattedCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      longDescription: course.longDescription,
      instructor: course.instructor,
      imageUrl: course.imageUrl,
      imageHint: course.imageHint,
      tags: course.tags ? JSON.parse(course.tags) : [],
      // price: course.price,
      created_at: course.created_at
    }));

    res.json(formattedCourses);
  });
});

// GET full course with lessons
router.get('/:id/', (req, res) => {
  const courseId = req.params.id;

  Course.getById(courseId, (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = rows[0];

    const formattedCourse = {
      id: course.id,
      title: course.title,
      description: course.description,
      longDescription: course.longDescription,
      instructor: course.instructor,
      imageUrl: course.imageUrl,
      imageHint: course.imageHint,
      tags: course.tags ? JSON.parse(course.tags) : [],
      price: course.price,
      created_at: course.created_at,
      category: {
        id: course.category_id,
        name: course.category_name,
        slug: course.category_slug
      },
      lessons: []
    };

    const Lesson = require('../models/Lesson');
    Lesson.getByCourseId(courseId, (err, lessonRows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch lessons' });
      }

      formattedCourse.lessons = lessonRows.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        created_at: lesson.created_at
      }));

      res.json(formattedCourse);
    });
  });
});

// POST create course (with image upload)
router.post('/', upload.single('image'), (req, res) => {
  const {
    title,
    description,
    longDescription,
    instructor,
    imageHint,
    category_id,
    tags,
    price // ✅ received from body
  } = req.body;

  // ✅ Parse and validate tags
  let tagsArray;
  try {
    tagsArray = JSON.parse(tags || '[]');
  } catch (err) {
    return res.status(400).json({ error: 'Invalid tags format. Must be a JSON array.' });
  }

  // ✅ Parse and validate price
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: 'Invalid or missing price. Must be a non-negative number.' });
  }

  const imageUrl = req.file ? `/assets/uploads/${req.file.filename}` : '';

  const course = {
    title,
    description,
    longDescription,
    instructor,
    imageUrl,
    imageHint,
    category_id: parseInt(category_id, 10) || null,
    tags: tagsArray,
    price: parsedPrice // ✅ now correctly parsed and validated
  };

  Course.create(course, (err, result) => {
    if (err) {
      console.error('Create error:', err);
      return res.status(500).json({ error: 'Failed to create course' });
    }
    res.status(201).json({ message: 'Course created', id: result.insertId });
  });
});

// PUT update course
router.put('/:id', upload.single('image'), (req, res) => {
  const courseId = req.params.id;

  Course.getById(courseId, (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const oldCourse = rows[0];

    const {
      title,
      description,
      longDescription,
      instructor,
      imageHint,
      category_id,
      tags,
      price
    } = req.body;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      return res.status(400).json({ error: 'Invalid price format' });
    }

    let tagsArray;
    try {
      tagsArray = JSON.parse(tags || '[]');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid tags format. Must be a JSON array.' });
    }

    let imageUrl = oldCourse.imageUrl;
    if (req.file) {
      imageUrl = `/assets/uploads/${req.file.filename}`;
      const oldImagePath = path.join(__dirname, '..', oldCourse.imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const course = {
      title,
      description,
      longDescription,
      instructor,
      imageUrl,
      imageHint,
      category_id: parseInt(category_id, 10) || null,
      tags: tagsArray,
      price: parsedPrice
    };

    Course.update(courseId, course, (err) => {
      if (err) {
        console.error('Update error:', err);
        return res.status(500).json({ error: 'Failed to update course' });
      }
      res.json({ message: 'Course updated' });
    });
  });
});

// DELETE course
router.delete('/:id', (req, res) => {
  const courseId = req.params.id;

  Course.getById(courseId, (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    const existing = rows[0];
    Course.delete(courseId, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete course' });

      const imagePath = path.join(__dirname, '..', existing.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      res.json({ message: 'Course deleted' });
    });
  });
});

// POST /enrollments
router.post('/enrollments', (req, res) => {
  const { user_id, course_id } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: 'Missing user_id or course_id' });
  }

  Enrollment.enroll(user_id, course_id, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Enrollment failed' });
    }
    res.json({ message: 'Enrolled successfully', result });
  });
});

// DELETE /enrollments/:userId/:courseId
router.delete('/enrollments/:userId/:courseId', (req, res) => {
  const { userId, courseId } = req.params;
  Enrollment.unenroll(userId, courseId, (err) => {
    if (err) return res.status(500).json({ error: 'Unenrollment failed' });
    res.json({ message: 'Unenrolled successfully' });
  });
});

module.exports = router;
