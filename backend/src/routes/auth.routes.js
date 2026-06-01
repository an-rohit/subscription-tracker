const express = require('express');
const {
  register,
  login,
  startGoogleLogin,
  redirectToGoogleLogin,
  googleCallback,
  logout,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', startGoogleLogin);
router.get('/google', redirectToGoogleLogin);
router.get('/google/callback', googleCallback);
router.post('/logout', logout);

module.exports = router;
