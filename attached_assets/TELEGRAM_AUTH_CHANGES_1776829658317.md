# Telegram Login — Backend Changes & Frontend Integration Guide

## Overview

Telegram login has been added to Vesselx using two complementary methods:

1. **Telegram Login Widget** — The official Telegram OAuth-style button. The user clicks the widget on your page, authorizes in Telegram, and your frontend receives a signed data object that the backend verifies cryptographically.
2. **Telegram Gateway API** — Sends a one-time password (OTP) to a user's Telegram account via their phone number. Works like SMS verification but delivered through Telegram.

---

## Backend Changes Summary

### 1. New Fields on the `User` Model (`models/User.js`)

Five new optional fields were added to every user document:

| Field | Type | Description |
|---|---|---|
| `telegramId` | `String` (sparse unique) | Telegram's numeric user ID (stored as string) |
| `telegramUsername` | `String` | The user's `@username` on Telegram |
| `telegramFirstName` | `String` | First name from Telegram profile |
| `telegramLastName` | `String` | Last name from Telegram profile |
| `telegramPhotoUrl` | `String` | Profile picture URL from Telegram |

All fields default to `null`. `telegramId` has a sparse unique index so multiple users can have `null` without conflicts.

### 2. New Config Keys (`config.js`)

Two new environment-variable-backed config accessors were added:

- `config.getTelegramBotToken()` → reads `process.env.TELEGRAM_BOT_TOKEN`
- `config.getTelegramGatewayToken()` → reads `process.env.TELEGRAM_GATEWAY_TOKEN`

**These secrets must be set as environment variables** before Telegram login will work. See the Setup section below.

### 3. New Route File (`routes/telegram-auth.js`)

A dedicated router handling all Telegram auth flows, mounted at `/api/auth/telegram`.

### 4. Route Registration (`server.js`)

```
k7nle.use('/api/auth/telegram', telegramAuthRouter);
```

This route is **public** (no auth middleware) because it IS the authentication endpoint.

---

## New API Endpoints

### `POST /api/auth/telegram/widget`

Logs in or creates a user via data received from the Telegram Login Widget.

**No authentication header required.**

**Request body:**
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://t.me/i/userpic/...",
  "auth_date": 1713700000,
  "hash": "abc123..."
}
```
> This is the exact object the Telegram widget passes to your `onauth` callback. Forward it as-is.

**Success response (`200` existing user / `201` new user):**
```json
{
  "message": "Login successful",
  "token": "<vesselx-jwt>",
  "isNewUser": false,
  "user": {
    "id": "...",
    "username": "johndoe",
    "name": "John Doe",
    "email": "tg_123456789@telegram.vesselx.internal",
    "profilePicture": "https://t.me/i/userpic/...",
    "isEmailVerified": true,
    "telegramId": "123456789",
    "telegramUsername": "johndoe",
    ...
  }
}
```

**Error responses:**
- `401` — Hash verification failed (data tampered or expired)
- `503` — Bot token not configured on server

---

### `POST /api/auth/telegram/gateway/send`

Sends a Telegram OTP to a phone number via the Telegram Gateway API.

**No authentication header required.**

**Request body:**
```json
{
  "phone_number": "+12025550123"
}
```
> Must be in E.164 format: `+` followed by country code and number, no spaces.

**Success response (`200`):**
```json
{
  "message": "Verification code sent via Telegram",
  "request_id": "abc-def-123",
  "telegram_id": "123456789"
}
```
> Store **both** `request_id` and `telegram_id` — pass both to the verify step. `telegram_id` may be absent if Telegram doesn't expose it for that number; this is fine, verification still works.

**Error responses:**
- `400` — Invalid phone format or Telegram delivery error
- `503` — Gateway token not configured on server

---

### `POST /api/auth/telegram/gateway/verify`

Verifies the OTP the user received on Telegram and logs them in (or creates their account).
When `telegram_id` is supplied, the backend fetches the user's real display name, username,
and profile picture from the Telegram Bot API and applies them to the account automatically.

**No authentication header required.**

**Request body:**
```json
{
  "request_id": "abc-def-123",
  "code": "482916",
  "phone_number": "+12025550123",
  "telegram_id": "123456789"
}
```
> `telegram_id` is optional but strongly recommended — it is what unlocks automatic profile fetching.

**Success response (`200` existing user / `201` new user):**
```json
{
  "message": "Login successful",
  "token": "<vesselx-jwt>",
  "isNewUser": true,
  "user": { ... }
}
```

**Error responses:**
- `400` — Wrong code, expired code, or missing fields
- `503` — Gateway token not configured on server

---

### `POST /api/auth/telegram/link`

Links a Telegram account to an **already-logged-in** Vesselx account. Use this for users who want to connect their Telegram after registration.

**Requires `Authorization: Bearer <token>` header.**

**Request body:** Same as `/widget` — the raw Telegram widget data object.

**Success response (`200`):**
```json
{
  "message": "Telegram account linked successfully",
  "telegramId": "123456789",
  "telegramUsername": "johndoe"
}
```

**Error responses:**
- `401` — Missing JWT or Telegram hash invalid
- `403` — Invalid JWT
- `409` — This Telegram account is already linked to a different Vesselx account

---

### `DELETE /api/auth/telegram/unlink`

Removes the Telegram link from the authenticated user's account.

**Requires `Authorization: Bearer <token>` header.**

**Success response (`200`):**
```json
{
  "message": "Telegram account unlinked successfully"
}
```

---

## Required Server Setup

Before these endpoints will work, two environment variables must be set on the server:

### `TELEGRAM_BOT_TOKEN`
1. Open Telegram and message `@BotFather`
2. Send `/newbot` and follow the prompts to create a bot
3. Copy the bot token (looks like `123456:ABC-DEF1234...`)
4. Set it: `TELEGRAM_BOT_TOKEN=<your-token>`
5. **Important:** Also tell BotFather what domain your frontend runs on — send `/setdomain` to BotFather and enter your frontend URL (e.g. `veseelx.qzz.io`). The widget will not work on domains that are not registered with the bot.

### `TELEGRAM_GATEWAY_TOKEN`
1. Go to [gateway.telegram.org](https://gateway.telegram.org) and log in with Telegram
2. Fund your account via [Fragment](https://fragment.com) (costs ~$0.01 per OTP; free for your own number during testing)
3. Copy your API token from the settings page
4. Set it: `TELEGRAM_GATEWAY_TOKEN=<your-gateway-token>`

---

## Frontend Integration Guide

### Method 1 — Telegram Login Widget (Recommended for web)

#### Step 1: Add the widget to your login page

```html
<script
  async
  src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="YOUR_BOT_USERNAME"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write">
</script>
```

Replace `YOUR_BOT_USERNAME` with the bot username you created in BotFather (e.g. `VesselxBot`).

#### Step 2: Handle the callback

```javascript
async function onTelegramAuth(telegramUser) {
  try {
    const response = await fetch('https://your-api.com/api/auth/telegram/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramUser)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Telegram login failed:', data.error);
      return;
    }

    // Store the JWT the same way you store it after normal login
    localStorage.setItem('token', data.token);

    if (data.isNewUser) {
      // New account — redirect to profile setup or onboarding
      window.location.href = '/onboarding';
    } else {
      // Existing user — redirect to home feed
      window.location.href = '/home';
    }
  } catch (err) {
    console.error('Network error:', err);
  }
}
```

#### Step 3 (Optional): For React or SPA frameworks

The widget is a plain script. To use it in React, inject it into the DOM inside a `useEffect`:

```jsx
import { useEffect, useRef } from 'react';

export function TelegramLoginButton({ botUsername, onAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, onAuth]);

  return <div ref={containerRef} />;
}
```

Usage:
```jsx
<TelegramLoginButton
  botUsername="VesselxBot"
  onAuth={async (user) => {
    const res = await fetch('/api/auth/telegram/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json();
    if (data.token) saveToken(data.token);
  }}
/>
```

---

### Method 2 — Telegram Gateway OTP (Phone-number based)

Use this when you want to authenticate users via their phone number through Telegram instead of SMS.

#### Step 1: Collect the phone number

```html
<input type="tel" id="phone" placeholder="+12025550123" />
<button onclick="sendTelegramOTP()">Send code via Telegram</button>
```

#### Step 2: Send the OTP

```javascript
let currentRequestId = null;
let currentTelegramId = null; // store this — it enables profile fetching on verify

async function sendTelegramOTP() {
  const phone = document.getElementById('phone').value.trim();

  const res = await fetch('/api/auth/telegram/gateway/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone })
  });

  const data = await res.json();

  if (!res.ok) {
    alert('Error: ' + data.error);
    return;
  }

  currentRequestId = data.request_id;
  currentTelegramId = data.telegram_id || null; // may be present or absent
  // Show the OTP input field to the user
  document.getElementById('otp-section').style.display = 'block';
}
```

#### Step 3: Verify the OTP

```javascript
async function verifyTelegramOTP() {
  const code = document.getElementById('otp-input').value.trim();
  const phone = document.getElementById('phone').value.trim();

  const body = {
    request_id: currentRequestId,
    code: code,
    phone_number: phone
  };

  // Always include telegram_id when available — this is what makes
  // the backend fetch the real display name, username, and profile picture
  if (currentTelegramId) {
    body.telegram_id = currentTelegramId;
  }

  const res = await fetch('/api/auth/telegram/gateway/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    alert('Verification failed: ' + data.error);
    return;
  }

  localStorage.setItem('token', data.token);
  window.location.href = data.isNewUser ? '/onboarding' : '/home';
}
```

---

### Method 3 — Linking Telegram to an Existing Account

For users who are already logged in and want to connect their Telegram:

```javascript
// Show the widget, then call this with the widget's callback data
async function linkTelegramAccount(telegramUser) {
  const token = localStorage.getItem('token');

  const res = await fetch('/api/auth/telegram/link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(telegramUser)
  });

  const data = await res.json();
  if (res.ok) {
    alert('Telegram linked! @' + data.telegramUsername);
  } else {
    alert('Error: ' + data.error);
  }
}

// To unlink:
async function unlinkTelegramAccount() {
  const token = localStorage.getItem('token');

  const res = await fetch('/api/auth/telegram/unlink', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();
  alert(data.message || data.error);
}
```

---

## Notes for Frontend Developers

- **The JWT returned by all Telegram endpoints is identical in format** to the JWT returned by the regular `/api/login` endpoint. Store and use it exactly the same way.
- **`isNewUser: true`** in the response means a new Vesselx account was just auto-created from the Telegram identity. You may want to redirect these users to a profile-completion page so they can set a proper username, bio, and so on.
- **Telegram widget accounts have placeholder emails** in the format `tg_<telegramId>@telegram.vesselx.internal`. These are not real email addresses. Do not send emails to them.
- **Phone-based Gateway accounts** have placeholder emails in the format `phone_<number>@phone.vesselx.internal`.
- The widget requires the page to be served from the **exact domain registered with BotFather** via `/setdomain`. Local development will need a tunnel (e.g. ngrok) or BotFather configured for your dev domain.
- All Telegram endpoints are **public** (no auth header needed) except `/link` and `/unlink`, which require an existing Vesselx JWT.

---

# Channel-Aware Notifications (Password Reset & Account Deletion)

Account-related verification codes are now delivered via the same channel the user signed up with — email for email accounts, Telegram for Telegram accounts. This is handled by a new dispatcher in `services/notificationService.js`.

## How channel detection works

For any user, the backend picks one of:

| Channel | When it's used |
|---|---|
| `email` | The user has a real email (not a `@telegram.vesselx.internal` or `@phone.vesselx.internal` placeholder) |
| `telegram_bot` | The user has a `telegramId` on file. Codes are sent as a Telegram message from your bot via the Bot API's `sendMessage` |
| `telegram_gateway` | The user only has a phone (Gateway signup) and no `telegramId`. Codes are sent via the Telegram Gateway API |
| `none` | No way to reach the user (rare; only happens if Telegram tokens aren't configured) |

## Updated: `POST /api/forgot-password`

Now smarter about Telegram-only accounts.

**Request body:** `{ "email": "..." }` OR `{ "username": "..." }`

**Behavior:**
- Email accounts → reset code sent by email (unchanged)
- Telegram-only accounts → returns `400` with `{ usesTelegramLogin: true, error: "..." }` so the frontend can show "Use the Telegram login button instead"
- Mixed accounts (real email + linked Telegram) → still sent by email, since password resets only matter when there's a password

**Response on success:**
```json
{
  "message": "If an account exists, you will receive a password reset link.",
  "deliveredVia": "email"
}
```

## NEW: Two-step Account Deletion

Account deletion now requires confirming a code sent via the user's signup channel. This protects users whose JWT might be stolen.

### Step 1 — `POST /api/account/delete/request`

Sends a 6-digit confirmation code to the user. Code expires in 30 minutes.

**Auth:** `Authorization: Bearer <token>` required.

**Request body:** None.

**Success response:**
```json
{
  "message": "A confirmation code has been sent. Enter it within 30 minutes to delete your account.",
  "deliveredVia": "telegram_bot"
}
```
> `deliveredVia` will be `email`, `telegram_bot`, or `telegram_gateway`. Show the right UI hint to the user (e.g. "Check your Telegram chat with @VesselxBot").

### Step 2 — `DELETE /api/account`

Now requires the confirmation code in the body. (Previously it deleted immediately.)

**Auth:** `Authorization: Bearer <token>` required.

**Request body:**
```json
{ "code": "482916" }
```

**Error responses:**
- `400` `{ requiresConfirmation: true }` — no code provided; show the user the request-code button
- `400 "Invalid or expired confirmation code"` — wrong or expired code

## Frontend Flow Examples

### Password reset

```javascript
const res = await fetch('/api/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
const data = await res.json();

if (data.usesTelegramLogin) {
  showMessage('This account uses Telegram. Click the Telegram login button instead.');
} else {
  showMessage(`Code sent via ${data.deliveredVia || 'email'}. Check your inbox or Telegram.`);
}
```

### Account deletion

```javascript
// Step 1: user clicks "Delete my account"
async function requestDeletion() {
  const res = await fetch('/api/account/delete/request', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  showCodeInput(`We sent a code to your ${data.deliveredVia.replace('_', ' ')}.`);
}

// Step 2: user enters the code and confirms
async function confirmDeletion(code) {
  const res = await fetch('/api/account', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });
  if (res.ok) {
    localStorage.removeItem('token');
    window.location.href = '/goodbye';
  }
}
```

## Important Notes

- **Telegram bot messages require the user to have started a chat with the bot.** If they signed up via the widget but never opened a conversation with `@YourBot`, the `sendMessage` call will fail with `Forbidden: bot can't initiate conversation with a user`. To work around this, the Telegram login widget message itself counts as "starting" the conversation if you use `data-request-access="write"` (which the integration already does). For users who explicitly blocked the bot, codes won't deliver — they'd need to unblock or contact support.
- **Telegram-only users have no password.** They're auto-assigned a random one at signup so the user record stays valid. The forgot-password endpoint detects this and tells them to use Telegram login instead.
- **Account deletion confirmation codes are 6 digits, expire in 30 minutes**, and are stored hashed-in-place on the user record (`accountDeletionCode`, `accountDeletionExpires`).
