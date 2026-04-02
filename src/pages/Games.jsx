import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiHash, FiZap, FiUsers, FiTrendingUp, FiPlay, FiRefreshCw, FiCopy, FiCheck } from 'react-icons/fi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import socket from '../utils/socket';

function twemojiUrl(emoji) {
  const cps = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://twemoji.maxcdn.com/v/latest/svg/${cps.join('-')}.svg`;
}
function TwemojiImg({ emoji, size = 24, className = '' }) {
  return <img src={twemojiUrl(emoji)} alt={emoji} width={size} height={size} draggable={false} className={`select-none object-contain inline-block ${className}`} loading="lazy" />;
}

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 12000, 20000];

function XPBar({ xp, level }) {
  const curr = LEVEL_XP[level - 1] || 0;
  const next = LEVEL_XP[level] || LEVEL_XP[LEVEL_XP.length - 1];
  const pct = next > curr ? Math.min(((xp - curr) / (next - curr)) * 100, 100) : 100;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] text-discord-muted mb-1">
        <span>{xp} XP</span>
        <span>Lv.{level + 1} needs {next} XP</span>
      </div>
      <div className="h-2 bg-discord-hover rounded-full overflow-hidden">
        <div className="h-full bg-discord-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CreateGameModal({ onClose, onCreate }) {
  const [gameType, setGameType] = useState('word_sprint');
  const [totalRounds, setTotalRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [inviteUsernames, setInviteUsernames] = useState('');
  const [isTournament, setIsTournament] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const invites = inviteUsernames.split(',').map(s => s.trim()).filter(Boolean);
      const data = await API.createGameRoom({
        gameType,
        totalRounds: parseInt(totalRounds),
        maxPlayers: parseInt(maxPlayers),
        isTournament,
        tournamentName: isTournament ? tournamentName : undefined,
        inviteUsernames: invites.length > 0 ? invites : undefined,
      });
      onCreate(data.room);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-discord-sidebar rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-discord-hover">
          <h2 className="font-bold text-discord-text text-lg">Create Game Room</h2>
          <p className="text-discord-muted text-sm mt-0.5">Set up a fun game for your friends</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-2 block">Game Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'word_sprint', label: 'Word Sprint', icon: '🔤', desc: 'Guess words fast' },
                { id: 'emoji_trivia', label: 'Emoji Trivia', icon: '🎭', desc: 'Decode emoji clues' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGameType(g.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${gameType === g.id ? 'border-discord-brand bg-discord-brand/10' : 'border-discord-hover hover:border-discord-brand/40'}`}
                >
                  <div className="mb-1"><TwemojiImg emoji={g.icon} size={28} /></div>
                  <div className="text-sm font-semibold text-discord-text">{g.label}</div>
                  <div className="text-[11px] text-discord-muted">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-discord-muted text-xs font-bold uppercase mb-1 block">Rounds</label>
              <input
                type="number" min={1} max={20}
                value={totalRounds}
                onChange={e => setTotalRounds(e.target.value)}
                className="discord-input w-full"
              />
            </div>
            <div>
              <label className="text-discord-muted text-xs font-bold uppercase mb-1 block">Max Players</label>
              <input
                type="number" min={2} max={20}
                value={maxPlayers}
                onChange={e => setMaxPlayers(e.target.value)}
                className="discord-input w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-1 block">Invite (optional)</label>
            <input
              type="text"
              value={inviteUsernames}
              onChange={e => setInviteUsernames(e.target.value)}
              placeholder="alice, bob, carol"
              className="discord-input w-full"
            />
            <p className="text-discord-muted text-[11px] mt-1">Comma-separated usernames</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isTournament} onChange={e => setIsTournament(e.target.checked)} className="accent-discord-brand" />
            <span className="text-discord-text text-sm font-medium">Tournament mode</span>
          </label>
          {isTournament && (
            <input
              type="text"
              value={tournamentName}
              onChange={e => setTournamentName(e.target.value)}
              placeholder="Tournament name..."
              className="discord-input w-full"
            />
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-discord-hover text-discord-text text-sm font-semibold hover:bg-discord-hover">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 py-2.5 rounded-xl bg-discord-brand text-white text-sm font-semibold disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose, onJoin }) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const data = await API.joinGameRoom(code.trim().toUpperCase());
      onJoin(data.room);
      onClose();
    } catch (err) {
      alert(err.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-discord-sidebar rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-discord-hover">
          <h2 className="font-bold text-discord-text">Join a Game</h2>
          <p className="text-discord-muted text-sm">Enter the invite code from your friend</p>
        </div>
        <div className="px-5 py-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3"
            maxLength={6}
            className="discord-input w-full text-center text-lg tracking-widest font-mono uppercase"
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-discord-hover text-discord-text text-sm font-semibold">Cancel</button>
          <button onClick={handleJoin} disabled={joining || !code.trim()} className="flex-1 py-2.5 rounded-xl bg-discord-brand text-white text-sm font-semibold disabled:opacity-60">
            {joining ? 'Joining...' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, currentUserId, onEnter }) {
  const [copied, setCopied] = useState(false);

  const copyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room.players?.[0]?.userId === currentUserId;
  const statusColor = room.status === 'waiting' ? 'text-yellow-400' : room.status === 'playing' ? 'text-discord-green' : 'text-discord-muted';
  const gameIcon = room.gameType === 'word_sprint' ? '🔤' : '🎭';
  const gameName = room.gameType === 'word_sprint' ? 'Word Sprint' : 'Emoji Trivia';

  return (
    <div
      className="bg-discord-hover/50 border border-discord-hover rounded-2xl p-4 cursor-pointer hover:border-discord-brand/40 transition-all active:scale-[0.98]"
      onClick={() => onEnter(room)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TwemojiImg emoji={gameIcon} size={26} />
          <div>
            <p className="font-bold text-discord-text text-sm">{gameName}</p>
            <p className={`text-xs font-semibold capitalize ${statusColor}`}>{room.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-discord-brand/10 text-discord-brand text-xs font-mono font-bold border border-discord-brand/20 hover:bg-discord-brand/20"
          >
            {copied ? <FiCheck size={11} /> : <FiCopy size={11} />}
            {room.inviteCode}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-discord-muted text-xs">
        <span className="flex items-center gap-1">
          <FiUsers size={11} /> {room.players?.length || 0} / {room.maxPlayers || 8} players
        </span>
        <span>{room.totalRounds} rounds</span>
        {isHost && <span className="text-discord-brand font-semibold">Host</span>}
      </div>
    </div>
  );
}

function RoomLobby({ room: initialRoom, currentUser, onClose }) {
  const [room, setRoom] = useState(initialRoom);
  const [round, setRound] = useState(null);
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const myId = currentUser?._id || currentUser?.id;
  const isHost = room.players?.[0]?.userId === myId;
  const canStart = isHost && room.players?.length >= 2 && room.status === 'waiting';

  useEffect(() => {
    socket.emit?.('joinGameRoom', room._id);
    const handlePlayerJoined = ({ players }) => setRoom(r => ({ ...r, players }));
    const handleGameStarted = ({ room: r, round: rd }) => { setRoom(r); setRound(rd); };
    const handleGuessResult = ({ roundResult, nextRound, gameOver: go }) => {
      if (roundResult) setResult(roundResult);
      if (go) setGameOver(go);
      else if (nextRound) setTimeout(() => { setRound(nextRound); setResult(null); setGuess(''); }, 3000);
    };
    socket.on?.('playerJoined', handlePlayerJoined);
    socket.on?.('gameStarted', handleGameStarted);
    socket.on?.('guessResult', handleGuessResult);
    return () => {
      socket.emit?.('leaveGameRoom', room._id);
      socket.off?.('playerJoined', handlePlayerJoined);
      socket.off?.('gameStarted', handleGameStarted);
      socket.off?.('guessResult', handleGuessResult);
    };
  }, [room._id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const data = await API.startGame(room._id);
      setRoom(data.room);
      setRound(data.round);
    } catch (err) { alert(err.message || 'Failed to start'); }
    finally { setStarting(false); }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await API.submitGameGuess(room._id, guess.trim());
      if (data.roundResult) setResult(data.roundResult);
      if (data.gameOver) setGameOver(data.gameOver);
      else if (!data.roundResult) setGuess('');
    } catch (err) { alert(err.message || 'Guess failed'); }
    finally { setSubmitting(false); }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const gameIcon = room.gameType === 'word_sprint' ? '🔤' : '🎭';

  return (
    <div className="fixed inset-0 bg-discord-bg z-[100] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-discord-hover flex-shrink-0">
        <button onClick={onClose} className="text-discord-muted hover:text-discord-text text-sm font-semibold">← Back</button>
        <span className="font-bold text-discord-text flex items-center gap-1"><TwemojiImg emoji={gameIcon} size={18} /> {room.gameType === 'word_sprint' ? 'Word Sprint' : 'Emoji Trivia'}</span>
        <button onClick={copyCode} className="flex items-center gap-1 text-xs font-mono font-bold text-discord-brand">
          {copied ? <FiCheck size={12} /> : <FiCopy size={12} />} {room.inviteCode}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {gameOver ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4"><TwemojiImg emoji="🏆" size={64} /></div>
            <h2 className="text-2xl font-bold text-discord-text mb-2">Game Over!</h2>
            <p className="text-discord-muted mb-6">Winner: <span className="text-discord-brand font-bold">@{gameOver.winner?.username}</span></p>
            <div className="space-y-2">
              {gameOver.players?.map((p, i) => (
                <div key={p.username} className="flex items-center gap-3 bg-discord-hover rounded-xl px-4 py-3">
                  <span className="text-lg font-bold text-discord-muted w-6">{i + 1}</span>
                  <span className="flex-1 font-semibold text-discord-text">@{p.username}</span>
                  <span className="font-bold text-discord-brand">{p.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="mt-6 discord-btn px-6 py-2.5 rounded-xl font-semibold">Back to Games</button>
          </div>
        ) : result ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-3"><TwemojiImg emoji={result.winnerId ? '✅' : '⏱️'} size={52} /></div>
            <h3 className="text-lg font-bold text-discord-text mb-1">Round {result.roundNumber} Result</h3>
            <p className="text-discord-muted mb-2">Answer: <span className="font-bold text-discord-text">{result.answer}</span></p>
            <div className="space-y-2 mt-4">
              {result.players?.map(p => (
                <div key={p.username} className="flex items-center justify-between bg-discord-hover rounded-xl px-4 py-2.5">
                  <span className="font-semibold text-discord-text">@{p.username}</span>
                  <div className="flex items-center gap-2">
                    {p.isCorrect && <span className="text-discord-green text-xs font-bold">✓ Correct</span>}
                    <span className="font-bold text-discord-brand">{p.score}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-discord-muted text-sm mt-4 animate-pulse">Next round starting...</p>
          </div>
        ) : round ? (
          <div className="text-center">
            <div className="mb-2 text-discord-muted text-sm">Round {round.roundNumber}</div>
            <div className="bg-discord-hover rounded-2xl p-6 mb-6">
              {room.gameType === 'emoji_trivia' ? (
                <div className="mb-3 flex justify-center gap-2 flex-wrap">
                  {round.emojis?.map((e, i) => <TwemojiImg key={i} emoji={e} size={56} />)}
                </div>
              ) : (
                <p className="text-discord-text font-semibold text-base leading-relaxed">{round.prompt}</p>
              )}
            </div>
            <form onSubmit={handleGuess} className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder={room.gameType === 'emoji_trivia' ? 'What does it mean?' : 'Your word...'}
                className="discord-input flex-1"
                autoFocus
                disabled={submitting}
              />
              <button type="submit" disabled={!guess.trim() || submitting} className="discord-btn px-4 rounded-xl disabled:opacity-50">
                <FiPlay size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3"><TwemojiImg emoji="🎮" size={52} /></div>
              <h2 className="text-xl font-bold text-discord-text">Waiting for players</h2>
              <p className="text-discord-muted text-sm mt-1">Share the code <span className="font-mono font-bold text-discord-brand">{room.inviteCode}</span> to invite friends</p>
            </div>
            <div className="space-y-2 mb-6">
              {room.players?.map((p, i) => (
                <div key={p.userId || i} className="flex items-center gap-3 bg-discord-hover rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-discord-brand/20 flex items-center justify-center text-discord-brand font-bold text-sm">
                    {(p.username || '?')[0].toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold text-discord-text">@{p.username}</span>
                  {i === 0 && <span className="text-discord-brand text-xs font-bold">Host</span>}
                </div>
              ))}
              {room.players?.length < 2 && (
                <div className="border-2 border-dashed border-discord-hover rounded-xl px-4 py-3 text-center text-discord-muted text-sm">
                  Waiting for at least 1 more player...
                </div>
              )}
            </div>
            {canStart && (
              <button onClick={handleStart} disabled={starting} className="discord-btn w-full py-3 rounded-xl font-bold text-base disabled:opacity-60">
                {starting ? 'Starting...' : <span className="flex items-center justify-center gap-1.5"><TwemojiImg emoji="🎮" size={18} /> Start Game</span>}
              </button>
            )}
            {!isHost && (
              <p className="text-center text-discord-muted text-sm">Waiting for the host to start the game...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Games({ currentUser, unreadCounts }) {
  const [tab, setTab] = useState('play');
  const [myRooms, setMyRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const myId = currentUser?._id || currentUser?.id;

  const loadPlayData = useCallback(async () => {
    setLoading(true);
    try {
      const [rooms, stats] = await Promise.all([
        API.getMyGameRooms().catch(() => ({ rooms: [] })),
        API.getMyGameStats().catch(() => null),
      ]);
      setMyRooms(Array.isArray(rooms) ? rooms : rooms?.rooms || []);
      setMyStats(stats);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getGameLeaderboard(20);
      setLeaderboard(data?.leaderboard || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'play') loadPlayData();
    else if (tab === 'leaderboard') loadLeaderboard();
  }, [tab]);

  if (activeRoom) {
    return (
      <RoomLobby
        room={activeRoom}
        currentUser={currentUser}
        onClose={() => { setActiveRoom(null); loadPlayData(); }}
      />
    );
  }

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-y-auto scrollable mobile-content-pad">
      {showCreate && (
        <CreateGameModal
          onClose={() => setShowCreate(false)}
          onCreate={(room) => { setMyRooms(prev => [room, ...prev]); setActiveRoom(room); }}
        />
      )}
      {showJoin && (
        <JoinModal
          onClose={() => setShowJoin(false)}
          onJoin={(room) => setActiveRoom(room)}
        />
      )}

      <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-discord-text flex items-center gap-1.5"><TwemojiImg emoji="🎮" size={22} /> Games</h1>
          <button onClick={() => { setRefreshing(true); tab === 'play' ? loadPlayData() : loadLeaderboard(); }}
            className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors">
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex border-b border-discord-hover max-w-2xl mx-auto">
          {[
            { id: 'play', label: 'Play', icon: FiPlay },
            { id: 'leaderboard', label: 'Leaderboard', icon: FiTrendingUp },
          ].map(t => (
            <button key={t.id}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === t.id ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-4">
        {tab === 'play' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setShowCreate(true)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-discord-brand text-white font-bold shadow-lg hover:bg-discord-brand/90 active:scale-95 transition-all">
                <FiPlus size={18} /> Create Game
              </button>
              <button onClick={() => setShowJoin(true)}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-discord-brand text-discord-brand font-bold hover:bg-discord-brand/10 active:scale-95 transition-all">
                <FiHash size={18} /> Join with Code
              </button>
            </div>

            {myStats && (
              <div className="bg-discord-hover/50 border border-discord-hover rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-discord-brand/20 flex items-center justify-center">
                    <FiZap size={20} className="text-discord-brand" />
                  </div>
                  <div>
                    <p className="font-bold text-discord-text">Level {myStats.level}</p>
                    <p className="text-discord-muted text-xs">{myStats.xp} XP total</p>
                  </div>
                </div>
                <XPBar xp={myStats.xp} level={myStats.level} />
                <div className="grid grid-cols-2 gap-3 mt-3 text-center">
                  <div className="bg-discord-bg rounded-xl p-2">
                    <p className="font-bold text-discord-text">{myStats.gameStats?.wordSprintWins || 0}</p>
                    <p className="text-discord-muted text-[11px] flex items-center justify-center gap-1"><TwemojiImg emoji="🔤" size={13} /> Word Sprint Wins</p>
                  </div>
                  <div className="bg-discord-bg rounded-xl p-2">
                    <p className="font-bold text-discord-text">{myStats.gameStats?.emojiTriviaWins || 0}</p>
                    <p className="text-discord-muted text-[11px] flex items-center justify-center gap-1"><TwemojiImg emoji="🎭" size={13} /> Emoji Trivia Wins</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-discord-hover rounded-2xl animate-pulse" />)}
              </div>
            ) : myRooms.length === 0 ? (
              <div className="text-center py-10 text-discord-muted">
                <div className="text-4xl mb-3">🎲</div>
                <p className="font-semibold text-discord-text mb-1">No games yet</p>
                <p className="text-sm">Create or join a game room to get started</p>
              </div>
            ) : (
              <>
                <p className="text-discord-muted text-xs font-bold uppercase tracking-wider mb-3">My Rooms</p>
                <div className="space-y-3">
                  {myRooms.map(room => (
                    <RoomCard key={room._id} room={room} currentUserId={myId} onEnter={setActiveRoom} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'leaderboard' && (
          <div className="space-y-2">
            {loading ? (
              [...Array(10)].map((_, i) => <div key={i} className="h-16 bg-discord-hover rounded-xl animate-pulse" />)
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-10 text-discord-muted">
                <div className="text-4xl mb-3">🏆</div>
                <p className="font-semibold text-discord-text mb-1">No data yet</p>
                <p className="text-sm">Play some games to appear on the leaderboard!</p>
              </div>
            ) : leaderboard.map((entry, i) => (
              <div key={entry.username} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${i === 0 ? 'bg-yellow-400/10 border border-yellow-400/30' : i === 1 ? 'bg-discord-muted/10 border border-discord-muted/20' : i === 2 ? 'bg-orange-400/10 border border-orange-400/20' : 'bg-discord-hover/50 border border-discord-hover'}`}>
                <span className="w-8 flex items-center justify-center">
                  {i < 3 ? <TwemojiImg emoji={i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} size={24} /> : <span className="font-black text-discord-muted">{i + 1}</span>}
                </span>
                <div className="w-9 h-9 rounded-full bg-discord-brand/20 flex items-center justify-center font-bold text-sm text-discord-brand flex-shrink-0">
                  {entry.profilePicture
                    ? <img src={API.getAvatarUrl(entry.profilePicture, 72)} className="w-9 h-9 rounded-full object-cover" alt={entry.username} />
                    : (entry.name || entry.username)[0].toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-discord-text text-sm truncate">{entry.name || entry.username}</p>
                  <p className="text-discord-muted text-xs">Lv.{entry.level} · {entry.xp} XP</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-discord-brand text-sm">{entry.gameStats?.wordSprintWins + entry.gameStats?.emojiTriviaWins || 0}</p>
                  <p className="text-discord-muted text-[11px]">wins</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
