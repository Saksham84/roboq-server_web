const Course = require('./Course');
const Lesson = require('./Lesson');
const Category = require('./Category');
const Certificate = require('./Certificate');
const User = require('./User'); // 💡 Import to initialize DB table
const Enrollment = require('./Enrollment');
const LessonProgress = require('./LessonProgress');
const Orders = require('./Order');

function initializeAllModels() {
  Category.init();
  Course.init();
  Lesson.init();
  Certificate.init();
  User.init();
  Enrollment.init();
  LessonProgress.init();
  Orders.init();
}

module.exports = initializeAllModels;
