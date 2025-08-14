const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const setAuthToken = require('../utils/setAuthToken');
const authMiddleware = require('../middleware/authMiddleware');
const { sendOtpEmail } = require('../utils/mailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Enrollment = require('../models/Enrollment');
const Order = require("../models/Order");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Multer config: store avatar in backend/assets/avatar
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../assets/avatar'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `avatar-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// ✅ Check auth status
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    isLoggedIn: req.isLoggedIn,
    user: req.user || null,
  });
});

// ✅ Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  User.findByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    setAuthToken(res, user);
    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email },
    });
  });
});

// ✅ Signup
router.post('/signup', (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  User.findByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (results.length > 0) return res.status(409).json({ error: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    User.create(name, email, hashedPassword, role, (err, result) => {
      if (err) return res.status(500).json({ error: 'Error creating user.' });

      const newUser = { id: result.insertId, name, email, role };
      setAuthToken(res, newUser);

      res.status(201).json({
        message: 'Signup successful',
        user: newUser,
      });
    });
  });
});

// ✅ Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ message: 'Logged out successfully.' });
});

// ✅ Get all users
router.get('/users', authMiddleware, (req, res) => {
  User.getAll((err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ users: results });
  });
});

// ✅ Get user by ID
router.get('/users/:id', authMiddleware, (req, res) => {
  User.getById(req.params.id, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  });
});

// ✅ Update user & avatar
router.put('/users/:id', authMiddleware, upload.single('avatar'), async (req, res) => {
  const { name, email, password, role } = req.body;
  const { id } = req.params;

  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

  let hashedPassword = null;
  let newAvatarUrl = null;

  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  User.getById(id, (err, existingUser) => {
    if (err || !existingUser) return res.status(404).json({ error: 'User not found.' });

    if (req.file) {
      newAvatarUrl = `/assets/avatar/${req.file.filename}`;

      // Remove old avatar if stored locally
      if (existingUser.avatarUrl && existingUser.avatarUrl.startsWith('/assets/avatar/')) {
        const oldAvatarPath = path.join(__dirname, '..', existingUser.avatarUrl.replace(/^\/+/, ''));
        fs.unlink(oldAvatarPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.warn('⚠️ Failed to delete old avatar:', err.message);
          }
        });
      }
    }

    const avatarToUpdate = newAvatarUrl || existingUser.avatarUrl;

    User.update(id, name, email, hashedPassword, role, avatarToUpdate, (updateErr) => {
      if (updateErr) return res.status(500).json({ error: 'Error updating user.' });

      res.json({ message: 'User updated successfully', avatarUrl: avatarToUpdate });
    });
  });
});

// ✅ Delete user & avatar
router.delete('/users/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  User.getById(id, (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found.' });

    const avatarPath = user.avatarUrl?.startsWith('/assets/avatar/')
      ? path.resolve(__dirname, '..', user.avatarUrl.replace(/^\/+/, ''))
      : null;

    User.delete(id, (deleteErr) => {
      if (deleteErr) return res.status(500).json({ error: 'Error deleting user.' });

      if (avatarPath && fs.existsSync(avatarPath)) {
        fs.unlink(avatarPath, (unlinkErr) => {
          if (unlinkErr && unlinkErr.code !== 'ENOENT') {
            console.error('Failed to delete avatar:', unlinkErr);
          }
        });
      }

      res.json({ message: 'User and avatar deleted successfully' });
    });
  });
});

// ✅ Forgot Password - Send OTP
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  User.findByEmail(email, async (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found.' });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    User.setOtp(email, otp, expiry, async (err) => {
      if (err) return res.status(500).json({ message: 'Error saving OTP.' });

      try {
        await sendOtpEmail(email, otp);
        res.json({ message: 'OTP sent to email.' });
      } catch {
        res.status(500).json({ message: 'Error sending email.' });
      }
    });
  });
});

// ✅ Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

  User.findByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error.' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found.' });

    const user = results[0];
    const now = new Date();

    if (user.otp !== otp || now > user.otp_expiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    res.json({ message: 'OTP verified.' });
  });
});

// ✅ Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password required.' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  User.updatePasswordByEmail(email, hashedPassword, (err) => {
    if (err) return res.status(500).json({ message: 'Error updating password.' });
    res.json({ message: 'Password reset successful.' });
  });
});

// GET /auth/users/:id/enrollments
router.get('/users/:id/enrollments', (req, res) => {
  const requestedUserId = parseInt(req.params.id);

  Enrollment.getEnrolledCoursesByUser(requestedUserId, (err, courses) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch enrollments' });
    res.json({ courses });
  });
});

// Create order and verify payment in one API
router.post("/purchase-course", authMiddleware, async (req, res) => {
  const { amount, course, paymentResponse } = req.body;

  if (!req.isLoggedIn || !req.user?.id) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }

  try {
    // Email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Razorpay instance
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // STEP 1: Create Razorpay Order
    if (!paymentResponse) {
      const order = await instance.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now(),
      });

      Order.create({
        userId: req.user.id,
        courseId: course.id,
        razorpayOrderId: order.id,
        amount: amount * 100,
        currency: "INR",
        receipt: order.receipt
      }, (err) => {
        if (err) {
          console.error("❌ Error saving order:", err);
          return res.status(500).json({ message: "Failed to save order" });
        }
        return res.json({ order });
      });
    }

    // STEP 2: Verify Payment & Enroll
    else {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;

      // Verify payment signature
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest("hex");

      if (expectedSign !== razorpay_signature) {
        // Send payment failed email
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: req.user.email,
          subject: "Payment Failed",
          html: `<p>Hello ${req.user.name || ''},</p>
                 <p>Your payment of ₹${amount} for the course could not be processed successfully.</p>
                 <p>Please try again.</p>`
        });

        return res.status(400).json({ message: "Invalid payment signature" });
      }

      // Update order
      Order.getByRazorpayOrderId(razorpay_order_id, (err, orders) => {
        if (err || orders.length === 0) {
          return res.status(404).json({ message: "Order not found" });
        }
        const orderId = orders[0].id;

        Order.updatePaymentDetails(orderId, {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "paid"
        }, async (err) => {
          if (err) {
            console.error("❌ Error updating payment:", err);
            return res.status(500).json({ message: "Payment update failed" });
          }

          // Enroll user
          Enrollment.enroll(req.user.id, course.id, async (err, result) => {
            if (err) {
              console.error("❌ Enrollment error:", err);
              return res.status(500).json({ error: "Enrollment failed" });
            }

            // Send success email
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: req.user.email,
              subject: "Payment Successful & Enrollment Confirmed",
              html: `<p>Hello ${req.user.name || ''},</p>
                     <p>Your payment of ₹${amount} was successful.</p>
                     <p>You have been successfully enrolled in the course (${course.title}).</p>
                     <p>Happy Learning!</p>`
            });

            return res.json({
              message: "Payment successful & enrolled successfully",
              enrollment: result
            });
          });
        });
      });
    }

  } catch (err) {
    console.error("❌ Payment Processing Error:", err);

    // Attempt to send failure email in case of error
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: req.user?.email,
        subject: "Payment Failed",
        html: `<p>Hello ${req.user?.name || ''},</p>
               <p>Your payment of ₹${amount} could not be completed due to a server error.</p>
               <p>Please try again later.</p>`
      });
    } catch (emailErr) {
      console.error("❌ Email sending error:", emailErr);
    }

    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
