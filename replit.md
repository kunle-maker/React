# VesselX Frontend

A feature-rich social media platform SPA built with React, Vite, and Tailwind CSS.

## Architecture

- **Framework**: React 18 + Vite
- **Routing**: React Router v6 (HashRouter)
- **Styling**: Tailwind CSS with custom discord-like theme
- **Real-time**: Socket.IO client
- **Build**: Vite with manual chunk splitting

## Backend

All API calls point to: `https://vesselx.onrender.com`
Socket connection also uses: `https://vesselx.onrender.com`

## Running the App

```bash
npm run dev
```

Runs on port 5000. Workflow: "Start application".

## Key Files

- `src/utils/api.js` — Centralized API class, all backend communication
- `src/utils/socket.js` — Socket.IO connection manager
- `src/App.jsx` — Root component, routing, auth state
- `src/pages/Login.jsx` — Login page with standard + Telegram auth
- `vite.config.js` — Vite config (port 5000, host: true)

## Authentication

### Standard
Username + password via `/api/login`.

### Telegram (Widget)
Uses the Telegram Login Widget. Set `VITE_TELEGRAM_BOT_USERNAME` env var to your bot's username (default: `VesselxBot`). The bot must have the frontend domain registered via BotFather `/setdomain`.

API method: `API.telegramWidgetLogin(telegramUser)`
Endpoint: `POST /api/auth/telegram/widget`

### Telegram (Gateway OTP)
Phone number based OTP sent via Telegram Gateway API.

API methods:
- `API.telegramGatewaySend(phoneNumber)` → `POST /api/auth/telegram/gateway/send`
- `API.telegramGatewayVerify(requestId, code, phoneNumber)` → `POST /api/auth/telegram/gateway/verify`

### Telegram Account Linking (logged-in users)
- `API.telegramLink(telegramUser)` → `POST /api/auth/telegram/link`
- `API.telegramUnlink()` → `DELETE /api/auth/telegram/unlink`

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_TELEGRAM_BOT_USERNAME` | Telegram bot username for the login widget (e.g. `VesselxBot`) |

## Features

- Feed, Posts, Stories, Reels
- Direct Messages + Group Chats (real-time via Socket.IO)
- WebRTC voice/video calls
- Groups/Channels
- Games (Tic-Tac-Toe, etc.)
- AI Assistant
- Internationalization (i18n) with RTL support
- PWA (service worker + manifest)
- Supa premium plans
