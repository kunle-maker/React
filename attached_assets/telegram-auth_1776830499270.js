const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const config = require('../config');
const GATEWAY_BASE_URL = 'https://gatewayapi.telegram.org';
const BOT_API_BASE = 'https://api.telegram.org';


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

/**
 * Fetches a Telegram user's profile (name, username, photo URL) via the Bot API.
 * Returns null gracefully if the bot cannot access the user's info.
 */
async function fetchTelegramProfile(telegramId, botToken) {
  if (!telegramId || !botToken) return null;

  try {
    const chatRes = await axios.get(
      `${BOT_API_BASE}/bot${botToken}/getChat`,
      { params: { chat_id: telegramId }, timeout: 5000 }
    );

    if (!chatRes.data.ok) return null;

    const chat = chatRes.data.result;
    const profile = {
      firstName: chat.first_name || null,
      lastName: chat.last_name || null,
      username: chat.username || null,
      photoUrl: null
    };

    try {
      const photosRes = await axios.get(
        `${BOT_API_BASE}/bot${botToken}/getUserProfilePhotos`,
        { params: { user_id: telegramId, limit: 1 }, timeout: 5000 }
      );

      if (photosRes.data.ok && photosRes.data.result.total_count > 0) {
        const photos = photosRes.data.result.photos;
        const bestPhoto = photos[0][photos[0].length - 1];

        const fileRes = await axios.get(
          `${BOT_API_BASE}/bot${botToken}/getFile`,
          { params: { file_id: bestPhoto.file_id }, timeout: 5000 }
        );

        if (fileRes.data.ok && fileRes.data.result.file_path) {
          profile.photoUrl = `${BOT_API_BASE}/file/bot${botToken}/${fileRes.data.result.file_path}`;
        }
      }
    } catch {
      // photo fetch is best-effort, not fatal
    }

    return profile;
  } catch {
    return null;
  }
}

async function findUniqueUsername(base) {
  const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'tguser';
  let candidate = cleaned;
  let suffix = 1;
  while (await User.findOne({ username: candidate })) {
    candidate = `${cleaned}${suffix}`;
    suffix++;
  }
  return candidate;
}

function buildJWT(user) {
  return jwt.sign(
    { userId: user._id, username: user.username },
    config.getJWTSecret()
  );
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

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/telegram/widget
 *
 * Authenticates via the Telegram Login Widget.
 * Finds the account by telegramId, or creates a new one using the widget data.
 * Always refreshes profile picture and display name from the latest widget data.
 *
 * Body: raw widget callback object { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
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

    const {
      id: telegramId,
      first_name,
      last_name,
      username: tgUsername,
      photo_url
    } = telegramData;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is missing from widget data' });
    }

    const displayName = [first_name, last_name].filter(Boolean).join(' ') || tgUsername || `tg_${telegramId}`;

    let user = await User.findOne({ telegramId: String(telegramId) });

    if (user) {
      user.telegramUsername = tgUsername || user.telegramUsername;
      user.telegramFirstName = first_name || user.telegramFirstName;
      user.telegramLastName = last_name || user.telegramLastName;
      user.telegramPhotoUrl = photo_url || user.telegramPhotoUrl;
      if (photo_url) user.profilePicture = photo_url;
      user.name = displayName;
      user.lastLoginDate = new Date();
      await user.save();

      const token = buildJWT(user);
      return res.json({ ...buildUserResponse(user, token), isNewUser: false });
    }

    const baseUsername = tgUsername
      ? tgUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      : `tg${telegramId}`;
    const uniqueUsername = await findUniqueUsername(baseUsername);

    user = new User({
      username: uniqueUsername,
      name: displayName,
      email: `tg_${telegramId}@telegram.vesselx.internal`,
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
 * Sends a one-time code to a phone number via the Telegram Gateway API.
 * Returns { request_id, telegram_id? } — telegram_id is included when available
 * and should be passed back to /gateway/verify to enable profile fetching.
 *
 * Body: { phone_number }  (E.164 format)
 */
router.post('/gateway/send', async (req, res) => {
  try {
    const gatewayToken = config.getTelegramGatewayToken();
    if (!gatewayToken) {
      return res.status(503).json({
        error: 'Telegram Gateway is not configured on this server. Please contact support.'
      });
    }

    const { phone_number, code_length } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required (E.164 format, e.g. +12025550123)' });
    }

    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(phone_number.replace(/\s+/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone number format. Use E.164 (e.g. +12025550123)' });
    }

    const payload = {
  phone_number: phone_number.replace(/\s+/g, ''),
  ttl: 300,
  code_length: code_length || 6
};

    const botToken = config.getTelegramBotToken();
    if (botToken) {
      const botInfo = await axios.get(`${BOT_API_BASE}/bot${botToken}/getMe`, { timeout: 3000 }).catch(() => null);
      if (botInfo?.data?.ok) {
        payload.sender_username = botInfo.data.result.username;
      }
    }

    const response = await axios.post(
      `${GATEWAY_BASE_URL}/sendVerificationMessage`,
      payload,
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

    const result = response.data.result;
    const reply = {
      message: 'Verification code sent via Telegram',
      request_id: result.request_id
    };

    if (result.telegram_id) {
      reply.telegram_id = String(result.telegram_id);
    }

    return res.json(reply);

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
 * Verifies the OTP and logs in (or creates) the user.
 * Pass telegram_id (received from /gateway/send) to enable automatic
 * profile fetching — the display name, username, and profile picture
 * will be pulled from Telegram's Bot API and applied to the account.
 *
 * Body: { request_id, code, phone_number, telegram_id? }
 */
router.post('/gateway/verify', async (req, res) => {
  try {
    const gatewayToken = config.getTelegramGatewayToken();
    if (!gatewayToken) {
      return res.status(503).json({
        error: 'Telegram Gateway is not configured on this server. Please contact support.'
      });
    }

    const { request_id, code, phone_number, telegram_id } = req.body;
    if (!request_id || !code) {
      return res.status(400).json({ error: 'request_id and code are required' });
    }
    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required to complete login' });
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

    const gatewayResult = response.data.result;
    const { verification_status } = gatewayResult;

    if (!verification_status || verification_status.status !== 'code_valid') {
      const statusMsg = verification_status?.status || 'unknown';
      return res.status(400).json({
        error: 'Invalid or expired verification code',
        status: statusMsg
      });
    }

    const resolvedTelegramId = telegram_id || gatewayResult.telegram_id
      ? String(telegram_id || gatewayResult.telegram_id)
      : null;

    const normalizedPhone = phone_number.replace(/\s+/g, '');
    const placeholderEmail = `phone_${normalizedPhone}@phone.vesselx.internal`;

    let tgProfile = null;
    const botToken = config.getTelegramBotToken();
    if (resolvedTelegramId && botToken) {
      tgProfile = await fetchTelegramProfile(resolvedTelegramId, botToken);
    }

    let user = await User.findOne({ telegramId: resolvedTelegramId }) ||
               await User.findOne({ email: placeholderEmail });

    if (user) {
      if (tgProfile) {
        const displayName = [tgProfile.firstName, tgProfile.lastName].filter(Boolean).join(' ') || user.name;
        user.name = displayName;
        if (tgProfile.username) user.telegramUsername = tgProfile.username;
        if (tgProfile.firstName) user.telegramFirstName = tgProfile.firstName;
        if (tgProfile.lastName) user.telegramLastName = tgProfile.lastName;
        if (tgProfile.photoUrl) {
          user.telegramPhotoUrl = tgProfile.photoUrl;
          user.profilePicture = tgProfile.photoUrl;
        }
      }
      if (resolvedTelegramId && !user.telegramId) {
        user.telegramId = resolvedTelegramId;
      }
      user.lastLoginDate = new Date();
      await user.save();

      const token = buildJWT(user);
      return res.json({ ...buildUserResponse(user, token), isNewUser: false });
    }

    const displayName = tgProfile
      ? [tgProfile.firstName, tgProfile.lastName].filter(Boolean).join(' ') || tgProfile.username
      : null;

    const baseUsername = tgProfile?.username
      ? tgProfile.username.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
      : resolvedTelegramId
        ? `tg${resolvedTelegramId}`
        : `user${normalizedPhone.replace(/\D/g, '').slice(-8)}`;

    const uniqueUsername = await findUniqueUsername(baseUsername);

    user = new User({
      username: uniqueUsername,
      name: displayName || uniqueUsername,
      email: placeholderEmail,
      password: crypto.randomBytes(32).toString('hex'),
      isEmailVerified: true,
      telegramId: resolvedTelegramId || null,
      telegramUsername: tgProfile?.username || null,
      telegramFirstName: tgProfile?.firstName || null,
      telegramLastName: tgProfile?.lastName || null,
      telegramPhotoUrl: tgProfile?.photoUrl || null,
      profilePicture: tgProfile?.photoUrl || null,
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
 * Fetches the user's Telegram profile (name, photo) from the Bot API and applies it.
 * Requires Authorization: Bearer <token>
 *
 * Body: raw Telegram widget data { id, first_name, ..., hash }
 */
router.post('/link', async (req, res) => {
  try {
    const botToken = config.getTelegramBotToken();
    if (!botToken) {
      return res.status(503).json({ error: 'Telegram login is not configured on this server.' });
    }

    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader && authHeader.split(' ')[1];
    if (!jwtToken) return res.status(401).json({ error: 'Access token required' });

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

    const tgProfile = await fetchTelegramProfile(String(telegramId), botToken);
    const resolvedPhoto = tgProfile?.photoUrl || photo_url || null;
    const resolvedName = [first_name, last_name].filter(Boolean).join(' ') ||
      tgProfile?.username || null;

    const updates = {
      telegramId: String(telegramId),
      telegramUsername: tgUsername || tgProfile?.username || null,
      telegramFirstName: first_name || tgProfile?.firstName || null,
      telegramLastName: last_name || tgProfile?.lastName || null,
      telegramPhotoUrl: resolvedPhoto
    };
    if (resolvedPhoto) updates.profilePicture = resolvedPhoto;
    if (resolvedName) updates.name = resolvedName;

    const user = await User.findByIdAndUpdate(decoded.userId, updates, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      message: 'Telegram account linked successfully',
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      profilePicture: user.profilePicture,
      name: user.name
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
 * Requires Authorization: Bearer <token>
 */
router.delete('/unlink', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader && authHeader.split(' ')[1];
    if (!jwtToken) return res.status(401).json({ error: 'Access token required' });

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

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'Telegram account unlinked successfully' });

  } catch (error) {
    console.error('Telegram unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink Telegram account' });
  }
});

module.exports = router;
