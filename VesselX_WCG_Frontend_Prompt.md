# VesselX — Word Chain Game (WCG) Frontend Integration Guide
**Replacing Word Sprint with the Word Chain Game (April 2026)**

---

## What Changed

Word Sprint has been replaced by the **Word Chain Game (WCG)**. The game type string is now `"word_chain"` — update any reference to `"word_sprint"` in the frontend.

Emoji Trivia is unchanged.

---

## How the Word Chain Game Works

1. Players take turns **one at a time** (not simultaneous).
2. Each turn, the active player receives:
   - A **required starting letter** (the last letter of the previous accepted word)
   - A **minimum word length** they must reach or exceed
   - A **time limit** (15–40 seconds)
3. The player types a real English word that:
   - Starts with the required letter
   - Is at least the minimum length
   - Has not been used already in this game
4. They can **try multiple times** within their time window — each failed attempt returns an error but the clock keeps running.
5. If the player **runs out of time** without submitting a valid word, they are **eliminated**.
6. The last player standing **wins**.
7. If only 2 players remain and one is eliminated, the other wins immediately.

**The chain**: each accepted word's **last letter** becomes the **starting letter** for the next player's turn. This is what makes it a chain.

---

## Difficulty Progression (automatic, server-controlled)

| Turns 1–4 | Turns 5–8 | Turns 9–12 | Turns 13–16 | Turns 17+ |
|-----------|-----------|------------|-------------|-----------|
| Min 3 letters | Min 4 letters | Min 5 letters | Min 6 letters | Min 7 letters |
| 35 seconds | 30 seconds | 25 seconds | 20 seconds | 15 seconds |

The first turn uses a random safe starting letter (A–W, avoiding Q, X, Z).

---

## Creating a Room

```
POST /api/games/create
Body:
{
  "gameType": "word_chain",          // or "emoji_trivia"
  "isTournament": false,
  "tournamentName": null,
  "maxPlayers": 8,
  "inviteUsernames": ["bob", "carol"] // optional — sends invite notifications
}

Note: "totalRounds" is ignored for word_chain — WCG has no fixed round count.
```

---

## Room Object Shape (WCG-specific fields added)

```json
{
  "_id": "...",
  "gameType": "word_chain",
  "inviteCode": "A1B2C3",
  "inviteLink": "/game/join/A1B2C3",
  "hostId": "...",
  "hostUsername": "alice",
  "status": "waiting",
  "players": [
    { "userId": "...", "username": "alice", "score": 0 }
  ],
  "maxPlayers": 8,
  "currentTurn": null,
  "eliminatedPlayers": [],
  "usedWords": [],
  "lastChainWord": null,
  "lastChainLetter": null,
  "lastActivity": "...",
  "createdAt": "..."
}
```

Once the game starts, `currentTurn` will be populated:

```json
"currentTurn": {
  "playerId": "...",
  "playerUsername": "bob",
  "playerIndex": 1,
  "letter": "T",
  "minWordLength": 4,
  "timeLimitSecs": 30,
  "startedAt": "2026-04-04T10:00:00.000Z",
  "turnNumber": 5
}
```

---

## Socket Events — WCG

Listen for these after joining the socket room with `socket.emit('joinGameRoom', roomId)`.

### `gameStarted`
Fires for all players when the host starts the game. The first turn event (`wcgTurnStarted`) follows immediately after.

```javascript
socket.on('gameStarted', ({ room }) => {
  // Transition from lobby UI to game UI
  // Show "Game starting..." then wait for wcgTurnStarted
});
```

---

### `wcgTurnStarted` — **most important event**
Fires at the start of every turn. All players receive it.

```javascript
socket.on('wcgTurnStarted', ({
  turnNumber,
  playerId,
  playerUsername,
  letter,            // required starting letter, e.g. "T"
  minWordLength,     // minimum word length, e.g. 4
  timeLimitSecs,     // countdown in seconds, e.g. 30
  startedAt,         // ISO timestamp — use for countdown timer
  prompt,            // ready-made display string
  activePlayers,     // array of usernames still in the game
  eliminatedPlayers, // array of eliminated usernames
  wordChainSoFar     // array of all accepted words so far
}) => {
  if (playerId === currentUser.id) {
    // Show input field + countdown timer
    showMyTurn({ letter, minWordLength, timeLimitSecs, startedAt });
  } else {
    // Show "playerUsername is typing..." with their countdown
    showOtherPlayerTurn({ playerUsername, timeLimitSecs, startedAt });
  }
  updateWordChain(wordChainSoFar);
  updatePlayerList(activePlayers, eliminatedPlayers);
});
```

**Countdown timer**: use `startedAt` + `timeLimitSecs` to compute time remaining client-side. Do NOT rely on a fixed `setTimeout` from when the event arrives (network delay).

```javascript
function getRemainingSeconds(startedAt, timeLimitSecs) {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, timeLimitSecs - elapsed);
}
```

---

### `wcgWordAccepted`
Fires to all players when the active player submits a valid word.

```javascript
socket.on('wcgWordAccepted', ({
  playerUsername,
  word,           // the accepted word, e.g. "tiger"
  nextLetter,     // last letter of accepted word = next turn's starting letter, e.g. "R"
  wordChainSoFar, // full chain array
  score           // that player's current score
}) => {
  appendWordToChain(word, nextLetter);
  updateScore(playerUsername, score);
  // wcgTurnStarted will follow immediately for the next player
});
```

---

### `playerEliminated`
Fires when a player's time runs out.

```javascript
socket.on('playerEliminated', ({
  username,
  reason,            // "Ran out of time!"
  eliminatedPlayers, // all eliminated usernames
  activePlayers      // remaining active usernames
}) => {
  if (username === currentUser.username) {
    showAlert("You ran out of time and have been eliminated!");
    // Switch to spectator view — they can still watch the chain continue
  } else {
    showToast(`${username} was eliminated — ran out of time!`);
  }
  updatePlayerList(activePlayers, eliminatedPlayers);
});
```

---

### `gameOver`
Fires when only one player remains.

```javascript
socket.on('gameOver', ({
  winner: { id, username },
  players,           // all players with final scores
  eliminatedPlayers, // elimination order
  wordChain          // complete list of words used
}) => {
  showGameOverScreen({ winner, players, wordChain });
  // XP is awarded server-side and push notification is sent
});
```

---

### Other events (same as before)
`playerJoined`, `playerLeft`, `playerKicked`, `roomCancelled` — unchanged, see the previous games prompt.

---

## Submitting a Word (active player only)

```
POST /api/games/guess
Body: { "roomId": "...", "guess": "tiger" }
```

### Success response (word accepted)
```json
{
  "accepted": true,
  "word": "tiger",
  "nextLetter": "R",
  "wordChainSoFar": ["apple", "elephant", "tiger"],
  "message": "\"tiger\" accepted! Next letter is \"R\""
}
```

### Error responses (word rejected — player can try again)
```json
{ "error": "Word must start with \"T\"", "hint": "Your word \"sun\" starts with \"S\", not \"T\"" }
{ "error": "Word must be at least 4 letters long. \"tin\" is only 3." }
{ "error": "\"tiger\" has already been used in this game. Try a different word!" }
{ "error": "\"xyzabc\" is not a recognised English word. Try again!" }
{ "error": "It's not your turn. Waiting for bob to play.", "waitingFor": "bob" }
{ "error": "Your time is up for this turn." }
```

**All error responses leave the turn active** — the player can immediately try another word. Show the error inline (not as a full-screen message) and keep the input field and countdown visible.

---

## Recommended WCG UI Layout

```
┌─────────────────────────────────────────┐
│  Word Chain Game                    👥 3 │
│  Turn 7 · Difficulty: Level 2           │
├─────────────────────────────────────────┤
│                                         │
│  🔗 Chain so far:                       │
│  apple → elephant → tiger → rabbit      │
│             (next starts with T)        │
│                                         │
├─────────────────────────────────────────┤
│  bob's turn                  ⏱ 0:24    │
│  ┌─────────────────────────┐            │
│  │ Type a word starting    │            │
│  │ with "T", min 4 letters │            │
│  └─────────────────────────┘            │
│  [  _____________  ]  [Submit]          │
│                                         │
│  ❌ "tin" is too short (need 4+ letters)│
├─────────────────────────────────────────┤
│  Players:                               │
│  ✅ alice   45 pts                      │
│  🎯 bob     30 pts  ← current turn      │
│  ✅ carol   20 pts                      │
│  ❌ dave    ~~eliminated~~              │
└─────────────────────────────────────────┘
```

### Spectator mode (eliminated players)
Eliminated players should still see:
- The ongoing word chain
- Whose turn it is + countdown
- Score updates
- A greyed-out input that says "You've been eliminated — watching the game"

### Key UI rules
- **Only show the input field** to the player whose turn it is (`playerId === currentUser.id`)
- **Show all players** with eliminated ones visually crossed out
- **The chain display** should animate each new word being added (e.g. slide in from the right)
- **Countdown colour**: green → yellow (under 15s) → red (under 7s)
- **On time out**: the eliminated event fires before `wcgTurnStarted` for the next player — briefly show "⏰ Time's up for [username]!" before transitioning

---

## gameStats fields (updated)

```json
{
  "wordChainWins": 3,
  "wordChainPlayed": 12,
  "emojiTriviaWins": 2,
  "emojiTriviaPlayed": 5,
  "totalXpEarned": 580
}
```

`wordSprintWins` / `wordSprintPlayed` are removed — use `wordChainWins` / `wordChainPlayed` instead.

---

## XP Rewards (WCG)

| Event | XP |
|-------|----|
| Winning the game | +50 |
| Each valid word accepted | +10 |
| Participating (all players at game end) | +5 |

XP is awarded automatically at the end. A push notification is sent to every player with their result and XP earned.
