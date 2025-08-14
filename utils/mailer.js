// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use your SMTP service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Your OTP for Password Reset",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
  });
};
