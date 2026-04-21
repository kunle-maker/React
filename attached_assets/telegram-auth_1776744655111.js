const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const config = require('../config');

const GATEWAY_BASE_URL = 'https://gatewayapi.telegram.org';

function verifyTelegramWidgetData(data, botToken) {
  const { hash, ...rest } = data;

  if (!hash) return { ok: false, reason: 'Missing hash' };

  const authDate = parseInt(rest.auth_date, 10);
  if (isNaN(authDate)) return { ok: false, reason: 'Invalid auth_date' };

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return { ok: false, reason: 'Auth data expired (older than 24 hours)' };
  }

  const checkString = Object.keys(rest)
    .filter(k => rest[k] != null && rest[k] !== undefined)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  const receivedHashBuf = Buffer.from(hash, 'hex');
  const computedHashBuf = Buffer.from(computedHash, 'hex');

  if (receivedHashBuf.length !== computedHashBuf.length) {
    return { ok: false, reason: 'Hash length mismatch' };
  }

  const isValid = crypto.timingSafeEqual(receivedHashBuf, computedHashBuf);
  return isValid ? { ok: true } : { ok: false, reason: 'Hash mismatch — data may be tampered' };
}

function generateUsernameFromTelegram(telegramUsername, telegramId) {
  if (telegramUsername) {
    return telegramUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  }
  return `tg_${telegramId}`;
}

async function findUniqueUsername(base) {
  let candidate = base;
  let suffix = 1;
  while (await User.findOne({ username: candidate })) {
    candidate = `${base}${suffix}`;
    suffix++;
  }
  return candidate;
}

function buildJWT(user) {
  const secretKey = config.getJWTSecret();
  return jwt.sign({ userId: user._id, username: user.username }, secretKey);
}

function buildUserResponse(user, token) {
  return {
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      followers: user.followers,
      following: user.following,
      isEmailVerified: user.isEmailVerified,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      isVerified: user.isVerified,
      isSupa: user.isSupa,
      badge: user.badge,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername
    }
  };
}

/**
 * POST /api/auth/telegram/widget
 *
 * Authenticates a user via data from the Telegram Login Widget.
 * If the Telegram account is already linked to a Vesselx account, logs them in.
 * If not, creates a new Vesselx account automatically.
 *
 * Body: { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 */
router.post('/widget', async (req, res) => {
  try {
    const botToken = config.getTelegramBotToken();
    if (!botToken) {
      return res.status(503).json({
        error: 'Telegram login is not configured on this server. Please contact support.'
      });
    }

    const telegramData = req.body;

    const verification = verifyTelegramWidgetData(telegramData, botToken);
    if (!verification.ok) {
      return res.status(401).json({ error: `Telegram verification failed: ${verification.reason}` });
    }

    const { id: telegramId, first_name, last_name, username: tgUsername, photo_url } = telegramData;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is missing from widget data' });
    }

    let user = await User.findOne({ telegramId: String(telegramId) });

    if (user) {
      user.telegramUsername = tgUsername || user.telegramUsername;
      user.telegramFirstName = first_name || user.telegramFirstName;
      user.telegramLastName = last_name || user.telegramLastName;
      user.telegramPhotoUrl = photo_url || user.telegramPhotoUrl;
      user.lastLoginDate = new Date();
      await user.save();

      const token = buildJWT(user);
      return res.json({ ...buildUserResponse(user, token), isNewUser: false });
    }

    const baseUsername = generateUsernameFromTelegram(tgUsername, telegramId);
    const uniqueUsername = await findUniqueUsername(baseUsername);
    const displayName = [first_name, last_name].filter(Boolean).join(' ') || uniqueUsername;

    const placeholderEmail = `tg_${telegramId}@telegram.vesselx.internal`;

    user = new User({
      username: uniqueUsername,
      name: displayName,
      email: placeholderEmail,
      password: crypto.randomBytes(32).toString('hex'),
      isEmailVerified: true,
      telegramId: String(telegramId),
      telegramUsername: tgUsername || null,
      telegramFirstName: first_name || null,
      telegramLastName: last_name || null,
      telegramPhotoUrl: photo_url || null,
      profilePicture: photo_url || null,
      lastLoginDate: new Date()
    });

    await user.save();

    const token = buildJWT(user);
    return res.status(201).json({ ...buildUserResponse(user, token), isNewUser: true });

  } catch (error) {
    console.error('Telegram widget login error:', error);
    res.status(500).json({ error: 'An internal error occurred during Telegram login' });
  }
});

/**
 * POST /api/auth/telegram/gateway/send
 *
 * Sends a one-time verification code to a phone number via the Telegram Gateway API.
 * Telegram will deliver the code through a Telegram message to the user.
 *
 * Body: { phone_number }  (E.164 format, e.g. "+12025550123")
 */
router.post('/gateway/send', async (req, res) => {
  try {
    const gatewayToken = config.getTelegramGatewayToken();
    if (!gatewayToken) {
      return res.status(503).json({
        error: 'Telegram Gateway is not configured on this server. Please contact support.'
      });
    }

    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required (E.164 format, e.g. +12025550123)' });
    }

    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use E.164 (e.g. +12025550123)' });
    }

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/sendVerificationMessage`,
      { phone_number, ttl: 300 },
      {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.ok) {
      return res.status(400).json({ error: response.data.error || 'Failed to send verification message' });
    }

    const { request_id } = response.data.result;
    return res.json({
      message: 'Verification code sent via Telegram',
      request_id
    });

  } catch (error) {
    const apiError = error.response?.data?.error;
    if (apiError) {
      return res.status(400).json({ error: apiError });
    }
    console.error('Telegram Gateway send error:', error);
    res.status(500).json({ error: 'Failed to send Telegram verification message' });
  }
});

/**
 * POST /api/auth/telegram/gateway/verify
 *
 * Verifies the OTP code entered by the user against the Telegram Gateway request.
 * On success, looks up or creates a Vesselx account for that phone number.
 *
 * Body: { request_id, code, phone_number }
 */
router.post('/gateway/verify', async (req, res) => {
  try {
    const gatewayToken = config.getTelegramGatewayToken();
    if (!gatewayToken) {
      return res.status(503).json({
        error: 'Telegram Gateway is not configured on this server. Please contact support.'
      });
    }

    const { request_id, code, phone_number } = req.body;
    if (!request_id || !code) {
      return res.status(400).json({ error: 'request_id and code are required' });
    }

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/checkVerificationStatus`,
      { request_id, code },
      {
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.ok) {
      return res.status(400).json({ error: response.data.error || 'Verification failed' });
    }

    const { verification_status } = response.data.result;

    if (!verification_status || verification_status.status !== 'code_valid') {
      const statusMsg = verification_status?.status || 'unknown';
      return res.status(400).json({
        error: 'Invalid or expired verification code',
        status: statusMsg
      });
    }

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required to complete login' });
    }

    const normalizedPhone = phone_number.replace(/\s+/g, '');

    let user = await User.findOne({ email: `phone_${normalizedPhone}@phone.vesselx.internal` });

    if (user) {
      user.lastLoginDate = new Date();
      await user.save();

      const token = buildJWT(user);
      return res.json({ ...buildUserResponse(user, token), isNewUser: false });
    }

    const baseUsername = `user_${normalizedPhone.replace(/\D/g, '').slice(-8)}`;
    const uniqueUsername = await findUniqueUsername(baseUsername);
    const placeholderEmail = `phone_${normalizedPhone}@phone.vesselx.internal`;

    user = new User({
      username: uniqueUsername,
      name: uniqueUsername,
      email: placeholderEmail,
      password: crypto.randomBytes(32).toString('hex'),
      isEmailVerified: true,
      lastLoginDate: new Date()
    });

    await user.save();

    const token = buildJWT(user);
    return res.status(201).json({ ...buildUserResponse(user, token), isNewUser: true });

  } catch (error) {
    const apiError = error.response?.data?.error;
    if (apiError) {
      return res.status(400).json({ error: apiError });
    }
    console.error('Telegram Gateway verify error:', error);
    res.status(500).json({ error: 'Failed to verify Telegram code' });
  }
});

/**
 * POST /api/auth/telegram/link
 *
 * Links a Telegram account to an existing authenticated Vesselx account.
 * Requires a valid Vesselx JWT in the Authorization header.
 *
 * Body: Telegram widget data { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 */
router.post('/link', async (req, res) => {
  try {
    const botToken = config.getTelegramBotToken();
    if (!botToken) {
      return res.status(503).json({
        error: 'Telegram login is not configured on this server.'
      });
    }

    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader && authHeader.split(' ')[1];
    if (!jwtToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(jwtToken, config.getJWTSecret());
    } catch {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const telegramData = req.body;
    const verification = verifyTelegramWidgetData(telegramData, botToken);
    if (!verification.ok) {
      return res.status(401).json({ error: `Telegram verification failed: ${verification.reason}` });
    }

    const { id: telegramId, first_name, last_name, username: tgUsername, photo_url } = telegramData;

    const existingLink = await User.findOne({ telegramId: String(telegramId) });
    if (existingLink && String(existingLink._id) !== String(decoded.userId)) {
      return res.status(409).json({ error: 'This Telegram account is already linked to another Vesselx account' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        telegramId: String(telegramId),
        telegramUsername: tgUsername || null,
        telegramFirstName: first_name || null,
        telegramLastName: last_name || null,
        telegramPhotoUrl: photo_url || null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      message: 'Telegram account linked successfully',
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername
    });

  } catch (error) {
    console.error('Telegram link error:', error);
    res.status(500).json({ error: 'Failed to link Telegram account' });
  }
});

/**
 * DELETE /api/auth/telegram/unlink
 *
 * Removes the Telegram link from the authenticated user's account.
 * Requires a valid Vesselx JWT in the Authorization header.
 */
router.delete('/unlink', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader && authHeader.split(' ')[1];
    if (!jwtToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(jwtToken, config.getJWTSecret());
    } catch {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      {
        telegramId: null,
        telegramUsername: null,
        telegramFirstName: null,
        telegramLastName: null,
        telegramPhotoUrl: null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'Telegram account unlinked successfully' });

  } catch (error) {
    console.error('Telegram unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink Telegram account' });
  }
});

module.exports = router;
