const jwt = require('jsonwebtoken');

/**
 * Generates a JWT and sets it as an HTTP-only cookie.
 * Works for both users and admins.
 * 
 * @param {Object} res - Express response object
 * @param {Object} userOrAdmin - User or Admin object with _id and role
 */
function setAuthToken(res, user) {
  const token = jwt.sign(
    { id: user.id}, 
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days 
  });
}

module.exports = setAuthToken;
