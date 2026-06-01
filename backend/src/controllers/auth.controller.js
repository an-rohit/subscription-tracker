const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  saveGoogleUserAndTokens,
} = require('../services/googleOAuth.service');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const startGoogleLogin = async (req, res) => {
  try {
    res.json({
      authUrl: getGoogleAuthUrl(),
      notice: 'Google Sign-In and Gmail read-only access require explicit user consent.',
    });
  } catch (err) {
    res.status(500).json({ message: 'Google OAuth is not configured', error: err.message });
  }
};

const redirectToGoogleLogin = async (req, res) => {
  try {
    res.redirect(getGoogleAuthUrl());
  } catch (err) {
    res.status(500).json({ message: 'Google OAuth is not configured', error: err.message });
  }
};

const googleCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code, error } = req.query;
    if (error) {
      return res.redirect(`${frontendUrl}/login?googleError=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${frontendUrl}/login?googleError=${encodeURIComponent('Missing Google OAuth code')}`);
    }

    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const result = await saveGoogleUserAndTokens({ profile, tokens });

    const params = new URLSearchParams({
      googleToken: result.token,
      user: JSON.stringify(result.user),
    });

    return res.redirect(`${frontendUrl}/login?${params.toString()}`);
  } catch (err) {
    return res.redirect(`${frontendUrl}/login?googleError=${encodeURIComponent(err.message)}`);
  }
};

const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  startGoogleLogin,
  redirectToGoogleLogin,
  googleCallback,
  logout,
};
