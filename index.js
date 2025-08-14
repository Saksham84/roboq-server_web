require('dotenv').config();
const express = require('express');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const path = require('path');
const initModels = require('./models/initModels');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allow multiple frontend origins
const allowedOrigins = [
  process.env.CLIENT_ORIGIN1,
  process.env.CLIENT_ORIGIN2,
].filter(Boolean);

// ✅ Initialize DB models
initModels();

// ===== Middleware =====
app.use(cookieParser());
app.use(express.json());

// ✅ Serve all static files under /assets
const assetsPath = path.join(__dirname, 'assets');
app.use('/assets', express.static(assetsPath, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// ✅ CORS config
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS Rejected:', origin);
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
}));

// ===== Routes =====
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const coursesRoutes = require('./routes/courses');
const categoryRoutes = require('./routes/categories');
const lessonsRoute = require('./routes/lessons');
const certificateRoutes = require('./routes/certificates');
const lessonprogressRoutes = require('./routes/progress');
const ordersRoutes = require('./routes/orders');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/lessons', lessonsRoute);
app.use('/api/certificates', certificateRoutes);
app.use('/api/progress', lessonprogressRoutes);
app.use('/api/orders', ordersRoutes);

// ===== Health check =====
app.get('/', (req, res) => {
  res.send('🚀 Server is up and running!');
});

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong.' });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Static assets served from /assets (uploads, videos, certificates)`);
});
