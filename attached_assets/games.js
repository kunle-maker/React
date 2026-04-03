const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const GameRoom = require('../models/GameRoom');
const User = require('../models/User');
const { notify } = require('../services/notificationHelper');

const { getIo } = require('../lib/io');

const XP_PER_WIN = 50;
const XP_PER_CORRECT = 10;
const XP_PER_GAME = 5;

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 12000, 20000];

function getLevelForXp(xp) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  return level;
}

function generateInviteCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

async function validateWordWithDictionary(word) {
  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`, { timeout: 5000 });
    return Array.isArray(res.data) && res.data.length > 0;
  } catch (e) {
    return false;
  }
}

async function getRandomWord(minLength, maxLength) {
  const wordLists = {
    3: ['cat', 'dog', 'bat', 'hat', 'fan', 'cup', 'sun', 'bus', 'ant', 'egg'],
    4: ['bird', 'fish', 'frog', 'cake', 'tree', 'moon', 'star', 'boat', 'fire', 'wind'],
    5: ['apple', 'grape', 'tiger', 'ocean', 'cloud', 'music', 'dance', 'bread', 'sugar', 'river'],
    6: ['butter', 'garden', 'window', 'bridge', 'candle', 'flower', 'mirror', 'planet', 'frozen', 'launch'],
    7: ['balloon', 'chapter', 'diamond', 'elastic', 'freedom', 'gravity', 'harvest', 'journey', 'kitchen', 'lantern'],
    8: ['aircraft', 'absolute', 'backbone', 'calendar', 'database', 'darkness', 'elephant', 'feathers', 'grateful', 'hardware'],
    9: ['adventure', 'beautiful', 'butterfly', 'chocolate', 'discovery', 'dreamlike', 'elaborate', 'frequency', 'greatness', 'happiness'],
    10: ['basketball', 'birthplace', 'celebrated', 'daydreamer', 'earthquake', 'everything', 'flashlight', 'generation', 'greenhouse', 'helicopter']
  };

  const length = Math.min(Math.max(minLength, 3), 10);
  const list = wordLists[length] || wordLists[5];
  return list[Math.floor(Math.random() * list.length)];
}

const EMOJI_TRIVIA_BANK = [
  { emojis: ['🌊', '🏄', '☀️', '🏖️'], answer: 'beach', hint: 'A sandy place by the sea' },
  { emojis: ['🎸', '🥁', '🎤', '🎵'], answer: 'concert', hint: 'A live music performance' },
  { emojis: ['🌙', '⭐', '🔭', '🪐'], answer: 'astronomy', hint: 'Study of stars and planets' },
  { emojis: ['🍕', '🍔', '🌮', '🍟'], answer: 'fastfood', hint: 'Quick meals you love' },
  { emojis: ['🏋️', '💪', '🥊', '🏅'], answer: 'workout', hint: 'Exercise to get stronger' },
  { emojis: ['📚', '✏️', '🎓', '🏫'], answer: 'school', hint: 'Where students learn' },
  { emojis: ['🌺', '🌻', '🌹', '🌷'], answer: 'flowers', hint: 'Colorful plants that bloom' },
  { emojis: ['🐠', '🦈', '🐙', '🦑'], answer: 'ocean', hint: 'The deep blue sea life' },
  { emojis: ['🎃', '👻', '🕷️', '🦇'], answer: 'halloween', hint: 'Spooky holiday in October' },
  { emojis: ['🚀', '🌍', '👨‍🚀', '🛸'], answer: 'space', hint: 'Beyond our atmosphere' },
  { emojis: ['🎂', '🎁', '🎈', '🥳'], answer: 'birthday', hint: 'Annual celebration of life' },
  { emojis: ['❄️', '⛄', '🛷', '🎿'], answer: 'winter', hint: 'The coldest season' },
  { emojis: ['🌈', '☔', '💧', '⛅'], answer: 'rainbow', hint: 'Colorful arc after rain' },
  { emojis: ['🏰', '👑', '🐉', '⚔️'], answer: 'kingdom', hint: 'Land ruled by a king' },
  { emojis: ['🎭', '🎬', '🎥', '🌟'], answer: 'movie', hint: 'Entertainment on screen' },
  { emojis: ['🌴', '🐘', '🦁', '🦒'], answer: 'safari', hint: 'African wildlife adventure' },
  { emojis: ['🎯', '🏆', '🥇', '🎉'], answer: 'champion', hint: 'The best competitor' },
  { emojis: ['🍣', '🥢', '🍱', '🎌'], answer: 'japan', hint: 'Land of the rising sun' },
  { emojis: ['🦋', '🌸', '🌱', '☀️'], answer: 'spring', hint: 'Season of new beginnings' },
  { emojis: ['🎲', '🃏', '♟️', '🎮'], answer: 'gaming', hint: 'Playing for fun and competition' }
];

async function awardXp(userId, amount, gameType, isWin) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    user.xp = (user.xp || 0) + amount;
    user.level = getLevelForXp(user.xp);
    user.gameStats = user.gameStats || {};
    user.gameStats.totalXpEarned = (user.gameStats.totalXpEarned || 0) + amount;

    if (gameType === 'word_sprint') {
      user.gameStats.wordSprintPlayed = (user.gameStats.wordSprintPlayed || 0) + 1;
      if (isWin) user.gameStats.wordSprintWins = (user.gameStats.wordSprintWins || 0) + 1;
    } else if (gameType === 'emoji_trivia') {
      user.gameStats.emojiTriviaPlayed = (user.gameStats.emojiTriviaPlayed || 0) + 1;
      if (isWin) user.gameStats.emojiTriviaWins = (user.gameStats.emojiTriviaWins || 0) + 1;
    }

    await user.save();
    return { xp: user.xp, level: user.level };
  } catch (e) {
    console.error('awardXp error:', e.message);
  }
}

router.post('/create', async (req, res) => {
  try {
    const { gameType = 'word_sprint', totalRounds = 5, isTournament = false, tournamentName, maxPlayers = 8, inviteUsernames = [] } = req.body;
    const userId = req.user.userId;
    const host = await User.findById(userId).select('username name');
    if (!host) return res.status(404).json({ error: 'User not found' });

    let inviteCode;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      attempts++;
      if (attempts > 10) break;
    } while (await GameRoom.findOne({ inviteCode }));

    const room = new GameRoom({
      gameType,
      inviteCode,
      hostId: userId,
      hostUsername: host.username,
      players: [{ userId, username: host.username, score: 0 }],
      totalRounds: Math.min(Math.max(totalRounds, 1), 20),
      isTournament,
      tournamentName: isTournament ? (tournamentName || `${host.username}'s Tournament`) : null,
      maxPlayers: Math.min(maxPlayers, 20),
      settings: {
        startWordLength: 3,
        maxWordLength: 10,
        startTimeSecs: 30,
        minTimeSecs: 5,
        xpPerWin: XP_PER_WIN,
        xpPerCorrect: XP_PER_CORRECT
      }
    });

    await room.save();

    if (inviteUsernames && inviteUsernames.length > 0) {
      const invitedUsers = await User.find({ username: { $in: inviteUsernames } }).select('_id username');
      for (const invUser of invitedUsers) {
        if (invUser._id.toString() !== userId) {
          notify({
            recipientId: invUser._id,
            actorId: userId,
            actorName: host.username,
            type: 'game_invite',
            gameRoomId: room._id,
            message: `${host.username} invited you to a ${gameType === 'word_sprint' ? 'Word Sprint' : 'Emoji Trivia'} game`,
            meta: { inviteCode: room.inviteCode, gameType },
            pushMeta: { gameType }
          }).catch(() => {});
        }
      }
    }

    res.status(201).json({
      room: {
        _id: room._id,
        gameType: room.gameType,
        inviteCode: room.inviteCode,
        inviteLink: `/game/join/${room.inviteCode}`,
        status: room.status,
        players: room.players,
        totalRounds: room.totalRounds,
        isTournament: room.isTournament,
        tournamentName: room.tournamentName
      }
    });
  } catch (err) {
    console.error('Create game room error:', err);
    res.status(500).json({ error: 'Failed to create game room' });
  }
});

router.post('/join', async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;

    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    const room = await GameRoom.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Game room not found' });
    if (room.status !== 'waiting') return res.status(400).json({ error: `Game is already ${room.status}` });
    if (room.players.length >= room.maxPlayers) return res.status(400).json({ error: 'Room is full' });

    const alreadyIn = room.players.some(p => p.userId.toString() === userId);
    if (alreadyIn) return res.status(200).json({ message: 'Already in room', room });

    const user = await User.findById(userId).select('username');
    if (!user) return res.status(404).json({ error: 'User not found' });

    room.players.push({ userId, username: user.username, score: 0 });
    await room.save();

    const io = getIo();
    if (io) io.to(`game_${room._id}`).emit('playerJoined', { username: user.username, players: room.players });

    res.status(200).json({ message: 'Joined successfully', room });
  } catch (err) {
    console.error('Join game room error:', err);
    res.status(500).json({ error: 'Failed to join game room' });
  }
});

router.post('/start', async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.userId;

    const room = await GameRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Game room not found' });
    if (room.hostId.toString() !== userId) return res.status(403).json({ error: 'Only the host can start the game' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Game is not in waiting state' });
    if (room.players.length < 2) return res.status(400).json({ error: 'Need at least 2 players to start' });

    room.status = 'in_progress';
    room.startedAt = new Date();

    const firstRound = await buildRound(room, 1);
    room.rounds.push(firstRound);
    room.currentRound = 1;

    await room.save();

    const io = getIo();
    const roundPayload = getRoundPayload(room, room.rounds[0]);
    if (io) io.to(`game_${room._id}`).emit('gameStarted', { room: sanitizeRoom(room), round: roundPayload });

    res.status(200).json({ message: 'Game started', room: sanitizeRoom(room), round: roundPayload });
  } catch (err) {
    console.error('Start game error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

router.post('/guess', async (req, res) => {
  try {
    const { roomId, guess } = req.body;
    const userId = req.user.userId;

    if (!guess) return res.status(400).json({ error: 'Guess is required' });

    const room = await GameRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Game room not found' });
    if (room.status !== 'in_progress') return res.status(400).json({ error: 'Game is not in progress' });

    const playerIdx = room.players.findIndex(p => p.userId.toString() === userId);
    if (playerIdx === -1) return res.status(403).json({ error: 'You are not in this game' });

    const roundIdx = room.currentRound - 1;
    const currentRound = room.rounds[roundIdx];
    if (!currentRound) return res.status(400).json({ error: 'No active round' });
    if (currentRound.endedAt) return res.status(400).json({ error: 'Round already ended' });

    const player = room.players[playerIdx];
    if (player.hasAnswered) return res.status(400).json({ error: 'You already answered this round' });

    const normalizedGuess = guess.toLowerCase().trim();
    const correctAnswer = currentRound.answer || currentRound.word;
    const isCorrect = normalizedGuess === correctAnswer.toLowerCase();

    player.hasAnswered = true;
    player.answer = normalizedGuess;
    player.answeredAt = new Date();
    player.isCorrect = isCorrect;

    if (isCorrect) {
      player.score += XP_PER_CORRECT;
    }

    const allAnswered = room.players.every(p => p.hasAnswered);
    let roundResult = null;

    if (allAnswered || isCorrect) {
      currentRound.endedAt = new Date();
      const correctPlayers = room.players.filter(p => p.isCorrect);
      if (correctPlayers.length > 0) {
        const fastest = correctPlayers.sort((a, b) => a.answeredAt - b.answeredAt)[0];
        currentRound.winnerId = fastest.userId;
        const winnerIdx = room.players.findIndex(p => p.userId.toString() === fastest.userId.toString());
        if (winnerIdx >= 0) room.players[winnerIdx].score += XP_PER_WIN;
      }

      roundResult = {
        roundNumber: currentRound.roundNumber,
        answer: correctAnswer,
        winnerId: currentRound.winnerId,
        players: room.players
      };

      if (room.currentRound < room.totalRounds) {
        const nextRoundNum = room.currentRound + 1;
        const wordLength = Math.min(room.settings.startWordLength + nextRoundNum - 1, room.settings.maxWordLength);
        const timeSecs = Math.max(room.settings.startTimeSecs - (nextRoundNum - 1) * 3, room.settings.minTimeSecs);
        const nextRound = await buildRound(room, nextRoundNum, wordLength, timeSecs);
        room.rounds.push(nextRound);
        room.currentRound = nextRoundNum;
        room.players.forEach(p => { p.hasAnswered = false; p.answer = null; p.isCorrect = false; });
      } else {
        room.status = 'completed';
        room.endedAt = new Date();
        const winner = room.players.sort((a, b) => b.score - a.score)[0];
        room.winnerId = winner.userId;
        room.winnerUsername = winner.username;

        for (const p of room.players) {
          const isWin = p.userId.toString() === winner.userId.toString();
          const xpAmount = p.score + XP_PER_GAME;
          await awardXp(p.userId, xpAmount, room.gameType, isWin);
          notify({
            recipientId: p.userId,
            actorId: room.hostId,
            actorName: room.hostUsername,
            type: 'game_result',
            gameRoomId: room._id,
            message: isWin ? 'You won the game!' : `${winner.username} won the game`,
            meta: { roomId: room._id.toString(), result: isWin ? 'win' : 'lose', xpEarned: xpAmount },
            pushMeta: { result: isWin ? 'win' : 'lose', gameType: room.gameType }
          }).catch(() => {});
        }
      }
    }

    await room.save();

    const io = getIo();
    if (io) {
      io.to(`game_${room._id}`).emit('guessResult', {
        userId,
        username: player.username,
        isCorrect,
        roundResult,
        nextRound: room.status === 'in_progress' && roundResult ? getRoundPayload(room, room.rounds[room.currentRound - 1]) : null,
        gameOver: room.status === 'completed' ? { winner: { id: room.winnerId, username: room.winnerUsername }, players: room.players } : null
      });
    }

    res.status(200).json({
      isCorrect,
      roundResult,
      gameOver: room.status === 'completed' ? { winner: { id: room.winnerId, username: room.winnerUsername }, players: room.players } : null
    });
  } catch (err) {
    console.error('Guess error:', err);
    res.status(500).json({ error: 'Failed to process guess' });
  }
});

router.get('/room/:roomId', async (req, res) => {
  try {
    const room = await GameRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room: sanitizeRoom(room) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

router.get('/room/by-code/:inviteCode', async (req, res) => {
  try {
    const room = await GameRoom.findOne({ inviteCode: req.params.inviteCode.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room: sanitizeRoom(room) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

router.get('/my-rooms', async (req, res) => {
  try {
    const userId = req.user.userId;
    const rooms = await GameRoom.find({
      $or: [{ hostId: userId }, { 'players.userId': userId }]
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ rooms: rooms.map(sanitizeRoom) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { gameType = 'all', limit = 20 } = req.query;
    let projection = { username: 1, name: 1, profilePicture: 1, xp: 1, level: 1, gameStats: 1 };
    let sort = { xp: -1 };

    const users = await User.find({ xp: { $gt: 0 } })
      .select(projection)
      .sort(sort)
      .limit(parseInt(limit));

    res.json({ leaderboard: users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('xp level gameStats username');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const nextLevelXp = LEVEL_THRESHOLDS[Math.min(user.level, LEVEL_THRESHOLDS.length - 1)] || null;
    const currentLevelXp = LEVEL_THRESHOLDS[Math.min(user.level - 1, LEVEL_THRESHOLDS.length - 1)] || 0;

    res.json({
      xp: user.xp || 0,
      level: user.level || 1,
      nextLevelXp,
      currentLevelXp,
      xpToNextLevel: nextLevelXp ? nextLevelXp - (user.xp || 0) : null,
      gameStats: user.gameStats || {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

async function buildRound(room, roundNumber, wordLength, timeSecs) {
  const length = wordLength || (room.settings.startWordLength + roundNumber - 1);
  const clampedLength = Math.min(length, room.settings.maxWordLength);
  const time = timeSecs || Math.max(room.settings.startTimeSecs - (roundNumber - 1) * 3, room.settings.minTimeSecs);

  let word = null, startLetter = null, emojis = [], answer = null;

  if (room.gameType === 'word_sprint') {
    word = await getRandomWord(clampedLength, clampedLength);
    startLetter = word[0].toUpperCase();
    answer = word;
  } else {
    const trivia = EMOJI_TRIVIA_BANK[Math.floor(Math.random() * EMOJI_TRIVIA_BANK.length)];
    emojis = trivia.emojis;
    answer = trivia.answer;
  }

  return {
    roundNumber,
    word: room.gameType === 'word_sprint' ? null : null,
    startLetter,
    wordLength: clampedLength,
    emojiClues: emojis,
    answer,
    timeLimitSecs: time,
    startedAt: new Date(),
    endedAt: null,
    winnerId: null
  };
}

function getRoundPayload(room, round) {
  if (!round) return null;
  if (room.gameType === 'word_sprint') {
    return {
      roundNumber: round.roundNumber,
      startLetter: round.startLetter,
      wordLength: round.wordLength,
      timeLimitSecs: round.timeLimitSecs,
      startedAt: round.startedAt,
      prompt: `Your word starts with "${round.startLetter}", length ${round.wordLength}, you have ${round.timeLimitSecs} seconds.`
    };
  } else {
    return {
      roundNumber: round.roundNumber,
      emojis: round.emojiClues,
      timeLimitSecs: round.timeLimitSecs,
      startedAt: round.startedAt,
      prompt: `What do these emojis represent? ${round.emojiClues.join(' ')}`
    };
  }
}

function sanitizeRoom(room) {
  const obj = room.toObject ? room.toObject() : room;
  const rounds = (obj.rounds || []).map(r => ({
    roundNumber: r.roundNumber,
    startLetter: r.startLetter,
    wordLength: r.wordLength,
    emojiClues: r.emojiClues,
    timeLimitSecs: r.timeLimitSecs,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    winnerId: r.winnerId
  }));
  return {
    _id: obj._id,
    gameType: obj.gameType,
    inviteCode: obj.inviteCode,
    inviteLink: `/game/join/${obj.inviteCode}`,
    hostId: obj.hostId,
    hostUsername: obj.hostUsername,
    players: obj.players,
    status: obj.status,
    currentRound: obj.currentRound,
    totalRounds: obj.totalRounds,
    isTournament: obj.isTournament,
    tournamentName: obj.tournamentName,
    rounds,
    winnerId: obj.winnerId,
    winnerUsername: obj.winnerUsername,
    startedAt: obj.startedAt,
    endedAt: obj.endedAt,
    createdAt: obj.createdAt
  };
}

module.exports = router;
