# VesselX — Games Update Integration Guide
**Word Sprint & Emoji Trivia room management changes (April 2026)**

---

## What Changed

| Feature | Status |
|---------|--------|
| Auto-delete inactive rooms after 10 minutes | NEW |
| Host can delete/close a room | NEW |
| Host can kick a player from the lobby | NEW |
| Player can leave a room | NEW |
| Minimum 2 players required to start | Already enforced — clearer error message now |
| Cancelled rooms reject new joins | NEW |
| New socket events: `roomCancelled`, `playerKicked`, `playerLeft` | NEW |

---

## Room Status Values

| Status | Meaning |
|--------|---------|
| `waiting` | Room is open, players can join, game not started |
| `in_progress` | Game is running |
| `completed` | Game finished normally |
| `cancelled` | Room was closed by host, or timed out due to inactivity |

---

## Auto-Inactivity Timeout

Rooms in `waiting` or `in_progress` state that have had **no activity for 10 minutes** are automatically cancelled by the server.

- "Activity" is updated on: room created, player joins, game starts, a guess is submitted
- When this fires, the server emits a `roomCancelled` socket event to all players in the room
- No frontend call needed — just listen for the socket event and redirect/dismiss accordingly

---

## New & Updated Endpoints

### Delete a room (host only)
```
DELETE /api/games/room/:roomId
Authorization: Bearer <token>

Success (200):
{ "message": "Room closed successfully" }

Errors:
403 — You are not the host
400 — Cannot delete a room while the game is in progress
404 — Room not found
```

The host **cannot** delete a room while a game is actively in progress. They'd have to wait for it to finish or let the inactivity timer cancel it. Rooms in `waiting` or `completed`/`cancelled` state can be deleted freely.

After deletion the room status becomes `cancelled`. A `roomCancelled` socket event is emitted to all players.

---

### Kick a player (host only, waiting state only)
```
POST /api/games/room/:roomId/kick
Authorization: Bearer <token>
Content-Type: application/json
Body: { "username": "playerToKick" }

Success (200):
{
  "message": "alice has been removed from the room",
  "players": [ ...updated player list... ]
}

Errors:
403 — You are not the host
400 — Players can only be kicked while in waiting state
400 — You cannot kick yourself
404 — Player not found in this room
```

After a kick, a `playerKicked` socket event is emitted so all lobby members update their UI, and the kicked player knows to leave.

---

### Leave a room (any player)
```
POST /api/games/room/:roomId/leave
Authorization: Bearer <token>

Success (200) — regular player:
{ "message": "Left room successfully", "players": [ ...updated list... ] }

Success (200) — if the host leaves:
{ "message": "Room closed because the host left" }

Errors:
400 — Cannot leave a game in progress
400 — You are not in this room
```

If the **host** leaves a waiting room, the room is cancelled and `roomCancelled` is emitted to everyone. If a regular player leaves, `playerLeft` is emitted to the remaining players.

---

### Start game (minimum 2 players — updated error message)
```
POST /api/games/start
Body: { "roomId": "..." }

Error when < 2 players:
{
  "error": "Need at least 2 players to start. Share your invite code to invite someone!"
}
```

Use this error text to show a helpful nudge with a "Copy Invite Code" button directly in the UI.

---

## Socket Events to Handle

Add these alongside your existing game socket listeners:

```javascript
// Someone (or inactivity) cancelled the room
socket.on('roomCancelled', ({ roomId, reason }) => {
  // reason is one of:
  // "The host closed the room"
  // "The host left the room"
  // "Room closed due to inactivity (10 minutes)"
  showAlert(reason);
  navigateTo('/games');  // or wherever your games lobby is
});

// A player was kicked — fires for ALL players in the room including the kicked one
socket.on('playerKicked', ({ username, players }) => {
  if (currentUser.username === username) {
    showAlert('You have been removed from this room by the host');
    navigateTo('/games');
  } else {
    updatePlayerList(players);
    showToast(`${username} was removed from the room`);
  }
});

// A player voluntarily left
socket.on('playerLeft', ({ username, players }) => {
  updatePlayerList(players);
  showToast(`${username} left the room`);
});
```

---

## Room Object (updated)

The room object returned by all endpoints now includes `lastActivity` and `maxPlayers`:

```json
{
  "_id": "...",
  "gameType": "word_sprint",
  "inviteCode": "A1B2C3",
  "inviteLink": "/game/join/A1B2C3",
  "hostId": "...",
  "hostUsername": "alice",
  "status": "waiting",
  "players": [
    { "userId": "...", "username": "alice", "score": 0, "hasAnswered": false }
  ],
  "maxPlayers": 8,
  "currentRound": 0,
  "totalRounds": 5,
  "isTournament": false,
  "tournamentName": null,
  "lastActivity": "2026-04-04T10:30:00.000Z",
  "createdAt": "2026-04-04T10:20:00.000Z"
}
```

---

## Recommended Lobby UI Behaviour

### For the host
- Show a **Close Room** button (calls `DELETE /api/games/room/:roomId`) — disabled if `status === 'in_progress'`
- Show a **Kick** button next to each player's name (not next to their own)
- Show a **Start Game** button — disabled with message "Need 2+ players" if `players.length < 2`
- Show **inactivity warning**: if the room has been open for 8+ minutes with no game start, show "Room closes in ~2 minutes due to inactivity" (compute from `lastActivity`)

### For all players (including host)
- Show a **Leave Room** button — disabled with tooltip "Cannot leave mid-game" if `status === 'in_progress'`
- When `roomCancelled` arrives → dismiss the lobby and show the reason

### Player count display
```
2 / 8 players   (show players.length / maxPlayers)
```
Show "Waiting for players..." if `players.length < 2`, "Ready to start!" if `players.length >= 2` and current user is not host.

---

## Inactivity Timer Display (optional but recommended)

You can show a live countdown using `lastActivity` from the room object:

```javascript
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;  // 10 minutes

function getTimeUntilClose(lastActivity) {
  const elapsed = Date.now() - new Date(lastActivity).getTime();
  const remaining = INACTIVITY_LIMIT_MS - elapsed;
  return Math.max(0, Math.floor(remaining / 1000));  // seconds remaining
}

// Re-poll room every 30s or track via socket activity updates
```

The server checks every 2 minutes, so the actual closure could happen up to 2 minutes after the 10-minute mark — factor this into any countdown display.
