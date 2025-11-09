const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../Static/constants');
const router = express.Router();

// Simplified OAuth2 token endpoint supporting authorization_code and refresh_token
router.post('/token', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { grant_type, code, refresh_token, client_id, client_secret } = req.body || {};
    const secret = process.env.JWT_SECRET || JWT_SECRET || 'fallback_secret';

    // For demo purposes, treat code as a user email and issue a JWT; in production, implement full auth code flow
    if (grant_type === 'authorization_code') {
      const email = String(code || '').trim().toLowerCase();
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: 'invalid_grant' });
      const access_token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });
      const refresh_token = jwt.sign({ id: user._id, type: 'refresh' }, secret, { expiresIn: '30d' });
      return res.json({ token_type: 'Bearer', access_token, refresh_token, expires_in: 7 * 24 * 3600 });
    }

    if (grant_type === 'refresh_token') {
      try {
        const payload = jwt.verify(refresh_token, secret);
        const access_token = jwt.sign({ id: payload.id }, secret, { expiresIn: '7d' });
        return res.json({ token_type: 'Bearer', access_token, refresh_token, expires_in: 7 * 24 * 3600 });
      } catch (e) {
        return res.status(400).json({ error: 'invalid_grant' });
      }
    }

    return res.status(400).json({ error: 'unsupported_grant_type' });
  } catch (e) {
    console.error('OAuth token error:', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// Minimal authorize endpoint to initiate linking; echoes back user email as code
router.get('/authorize', async (req, res) => {
  const { response_type, client_id, redirect_uri, state, login_hint } = req.query;
  const email = String(login_hint || '').trim().toLowerCase();
  const code = email || 'demo@voodoohome.local';
  const redirect = `${redirect_uri}?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
  return res.redirect(302, redirect);
});

module.exports = router;

