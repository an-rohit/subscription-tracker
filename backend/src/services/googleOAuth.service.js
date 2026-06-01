const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { encrypt } = require('./tokenCrypto.service');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const requiredEnv = () => {
  const values = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (!value) throw new Error(`Missing Google OAuth env: ${key}`);
  });

  return values;
};

const getGoogleAuthUrl = () => {
  const { clientId, redirectUri } = requiredEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
    ].join(' '),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const exchangeCodeForTokens = async (code) => {
  const { clientId, clientSecret, redirectUri } = requiredEnv();
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await axios.post(GOOGLE_TOKEN_URL, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

const fetchGoogleProfile = async (accessToken) => {
  const res = await axios.get(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
};

const saveGoogleUserAndTokens = async ({ profile, tokens }) => {
  const tokenExpiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      googleId: profile.id,
      name: profile.name || profile.email,
      profilePicture: profile.picture || null,
    },
    create: {
      googleId: profile.id,
      name: profile.name || profile.email,
      email: profile.email,
      profilePicture: profile.picture || null,
    },
  });

  const existingToken = await prisma.googleToken.findFirst({
    where: { userId: user.id },
  });

  const tokenData = {
    accessToken: encrypt(tokens.access_token),
    tokenExpiry,
    ...(tokens.refresh_token && { refreshToken: encrypt(tokens.refresh_token) }),
  };

  if (existingToken) {
    await prisma.googleToken.update({
      where: { id: existingToken.id },
      data: tokenData,
    });
  } else {
    await prisma.googleToken.create({
      data: {
        userId: user.id,
        ...tokenData,
      },
    });
  }

  const appToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token: appToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture,
    },
  };
};

module.exports = {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  saveGoogleUserAndTokens,
};
