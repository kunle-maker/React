import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiHash, FiZap, FiUsers, FiTrendingUp, FiPlay, FiRefreshCw, FiCopy, FiCheck, FiArrowLeft, FiX, FiLogOut, FiUserX, FiClock } from 'react-icons/fi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import socket from '../utils/socket';
import { showToast } from '../utils/toast';

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

function CreateGameModal({ onClose }) {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState('word_chain');
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
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      showToast(err.message || 'Failed to create room', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4">
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
                { id: 'word_chain', label: 'Word Chain', icon: '🔗', desc: 'Chain words together' },
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
            {gameType === 'emoji_trivia' && (
              <div>
                <label className="text-discord-muted text-xs font-bold uppercase mb-1 block">Rounds</label>
                <input
                  type="number" min={1} max={20}
                  value={totalRounds}
                  onChange={e => setTotalRounds(e.target.value)}
                  className="discord-input w-full"
                />
              </div>
            )}
            <div className={gameType === 'emoji_trivia' ? '' : 'col-span-2'}>
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

function VsAIModal({ onClose }) {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('medium');
  const [totalRounds, setTotalRounds] = useState(5);
  const [creating, setCreating] = useState(false);

  const handleStart = async (gameType) => {
    setCreating(true);
    try {
      const payload = { gameType, difficulty };
      if (gameType === 'emoji_trivia') payload.totalRounds = parseInt(totalRounds);
      const data = await API.createVsAI(payload);
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      showToast(err.message || 'Failed to start AI game', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const difficulties = [
    { id: 'easy', label: 'Easy', desc: 'AI makes mistakes', icon: '😴' },
    { id: 'medium', label: 'Medium', desc: 'Balanced challenge', icon: '🤖' },
    { id: 'hard', label: 'Hard', desc: 'Nearly unbeatable', icon: '💀' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4">
      <div className="bg-discord-sidebar rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-discord-hover">
          <h2 className="font-bold text-discord-text text-lg flex items-center gap-2">
            <TwemojiImg emoji="🤖" size={22} /> Play vs AI
          </h2>
          <p className="text-discord-muted text-sm mt-0.5">Choose your AI difficulty</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-2 block">Difficulty</label>
            <div className="space-y-2">
              {difficulties.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${difficulty === d.id ? 'border-discord-brand bg-discord-brand/10' : 'border-discord-hover hover:border-discord-brand/40'}`}
                >
                  <TwemojiImg emoji={d.icon} size={24} />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-discord-text">{d.label}</div>
                    <div className="text-[11px] text-discord-muted">{d.desc}</div>
                  </div>
                  {difficulty === d.id && <div className="w-2 h-2 rounded-full bg-discord-brand flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-1 block">Rounds (Emoji Trivia only)</label>
            <input
              type="number" min={1} max={20}
              value={totalRounds}
              onChange={e => setTotalRounds(e.target.value)}
              className="discord-input w-full"
            />
          </div>
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-2 block">Choose Game</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStart('word_chain')}
                disabled={creating}
                className="flex flex-col items-center gap-2 py-4 rounded-xl bg-discord-brand text-white font-bold text-sm disabled:opacity-60 hover:bg-discord-brand/90 active:scale-95 transition-all shadow-lg"
              >
                <TwemojiImg emoji="🔗" size={26} />
                Word Chain
              </button>
              <button
                onClick={() => handleStart('emoji_trivia')}
                disabled={creating}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-discord-brand text-discord-brand font-bold text-sm disabled:opacity-60 hover:bg-discord-brand/10 active:scale-95 transition-all"
              >
                <TwemojiImg emoji="🎭" size={26} />
                Emoji Trivia
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button onClick={onClose} disabled={creating} className="w-full py-2.5 rounded-xl border border-discord-hover text-discord-muted text-sm font-semibold hover:bg-discord-hover disabled:opacity-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ onClose, inviteCode = '' }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(inviteCode);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      let data;
      try {
        data = await API.joinGameRoom(code.trim().toUpperCase());
      } catch {
        data = await API.joinTTT(code.trim().toUpperCase());
      }
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      showToast(err.message || 'Invalid invite code', { type: 'error' });
      if (inviteCode) onClose();
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (inviteCode) handleJoin();
  }, [inviteCode]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4">
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
            placeholder="E97E8BCE82"
            maxLength={10}
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

function TicTacToeModal({ onClose, currentUser }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(currentUser?.isVerified ? 'ai' : 'human');
  const [difficulty, setDifficulty] = useState('medium');
  const [creating, setCreating] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload = mode === 'ai' ? { difficulty } : {};
      const data = await API.createTTT(payload);
      if (mode === 'ai' || data.room.status === 'in_progress') {
        navigate(`/game/room/${data.room._id}`, { replace: true });
      } else {
        setWaitingRoom(data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create game', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const copyCode = () => {
    if (!waitingRoom?.inviteCode) return;
    navigator.clipboard?.writeText(waitingRoom.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (waitingRoom) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4">
        <div className="bg-discord-sidebar rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-discord-hover">
            <h2 className="font-bold text-discord-text text-lg flex items-center gap-2">
              <TwemojiImg emoji="❌" size={22} /> Tic-Tac-Toe
            </h2>
            <p className="text-discord-muted text-sm mt-0.5">Share the code with your opponent</p>
          </div>
          <div className="px-5 py-6 text-center space-y-4">
            <div className="bg-discord-hover/50 border border-discord-hover rounded-2xl p-6">
              <p className="text-discord-muted text-xs font-bold uppercase tracking-wider mb-2">Invite Code</p>
              <p className="text-3xl font-black text-discord-text tracking-widest font-mono mb-4">{waitingRoom.inviteCode}</p>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-discord-brand text-white text-sm font-bold shadow-md hover:bg-discord-brand/90 active:scale-95 transition-all"
              >
                {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <p className="text-discord-muted text-xs">You are <span className="font-bold text-discord-brand">X</span> and go first once your opponent joins</p>
            <button
              onClick={() => navigate(`/game/room/${waitingRoom.room._id}`, { replace: true })}
              className="w-full py-3 rounded-xl bg-discord-brand/10 border border-discord-brand/20 text-discord-brand font-bold text-sm hover:bg-discord-brand/20 transition-all"
            >
              Go to Waiting Room
            </button>
          </div>
          <div className="px-5 pb-5">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-discord-hover text-discord-muted text-sm font-semibold hover:bg-discord-hover">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const difficulties = [
    { id: 'easy', label: 'Easy', desc: 'AI makes mistakes', icon: '😴' },
    { id: 'medium', label: 'Medium', desc: 'Balanced challenge', icon: '🤖' },
    { id: 'hard', label: 'Hard', desc: 'Unbeatable minimax', icon: '💀' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4">
      <div className="bg-discord-sidebar rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-discord-hover">
          <h2 className="font-bold text-discord-text text-lg flex items-center gap-2">
            <TwemojiImg emoji="❌" size={22} /> Tic-Tac-Toe
          </h2>
          <p className="text-discord-muted text-sm mt-0.5">Classic 1v1 game</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-discord-muted text-xs font-bold uppercase mb-2 block">Mode</label>
            <div className={`grid gap-2 ${currentUser?.isVerified ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {[
                { id: 'ai', label: 'vs VesselBot', icon: '🤖', requiresVerified: true },
                { id: 'human', label: 'vs Friend', icon: '👥', requiresVerified: false },
              ].filter(m => !m.requiresVerified || currentUser?.isVerified).map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${mode === m.id ? 'border-discord-brand bg-discord-brand/10' : 'border-discord-hover hover:border-discord-brand/40'}`}
                >
                  <div className="mb-1"><TwemojiImg emoji={m.icon} size={24} /></div>
                  <div className="text-sm font-bold text-discord-text">{m.label}</div>
                </button>
              ))}
            </div>
            {!currentUser?.isVerified && (
              <p className="text-discord-muted text-xs text-center mt-1 flex items-center justify-center gap-1">
                <span>🔒</span> vs VesselBot is available for Verified users only
              </p>
            )}
          </div>
          {mode === 'ai' && (
            <div>
              <label className="text-discord-muted text-xs font-bold uppercase mb-2 block">Difficulty</label>
              <div className="space-y-2">
                {difficulties.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${difficulty === d.id ? 'border-discord-brand bg-discord-brand/10' : 'border-discord-hover hover:border-discord-brand/40'}`}
                  >
                    <TwemojiImg emoji={d.icon} size={22} />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-discord-text">{d.label}</div>
                      <div className="text-[11px] text-discord-muted">{d.desc}</div>
                    </div>
                    {difficulty === d.id && <div className="w-2 h-2 rounded-full bg-discord-brand flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-discord-hover text-discord-text text-sm font-semibold hover:bg-discord-hover">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 py-2.5 rounded-xl bg-discord-brand text-white text-sm font-semibold disabled:opacity-60 hover:bg-discord-brand/90 active:scale-95 transition-all"
          >
            {creating ? 'Creating...' : mode === 'ai' ? 'Play vs Bot' : 'Create Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, currentUserId }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const copyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room.players?.[0]?.userId === currentUserId;
  const statusColor = room.status === 'waiting' ? 'text-yellow-400' : room.status === 'in_progress' ? 'text-discord-green' : 'text-discord-muted';
  const gameIcon = room.gameType === 'word_chain' ? '🔗' : room.gameType === 'tic_tac_toe' ? '❌' : '🎭';
  const gameName = room.gameType === 'word_chain' ? 'Word Chain' : room.gameType === 'tic_tac_toe' ? 'Tic-Tac-Toe' : 'Emoji Trivia';

  return (
    <div
      className="bg-discord-hover/50 border border-discord-hover rounded-2xl p-4 cursor-pointer hover:border-discord-brand/40 transition-all active:scale-[0.98]"
      onClick={() => navigate(`/game/room/${room._id}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TwemojiImg emoji={gameIcon} size={26} />
          <div>
            <p className="font-bold text-discord-text text-sm">{gameName}</p>
            <p className={`text-xs font-semibold capitalize ${statusColor}`}>{room.status.replace('_', ' ')}</p>
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
        {room.gameType !== 'word_chain' && <span>{room.totalRounds} rounds</span>}
        {isHost && <span className="text-discord-brand font-semibold">Host</span>}
      </div>
    </div>
  );
}

function getRemainingSeconds(startedAt, timeLimitSecs) {
  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
  return Math.max(0, timeLimitSecs - elapsed);
}

function RoomLobby({ roomId, currentUser, onClose }) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [round, setRound] = useState(null);
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kicking, setKicking] = useState(null);
  const [timeUntilClose, setTimeUntilClose] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // WCG-specific state
  const [currentTurn, setCurrentTurn] = useState(null);
  const [wordChain, setWordChain] = useState([]);
  const [wcgActivePlayers, setWcgActivePlayers] = useState([]);
  const [wcgEliminatedPlayers, setWcgEliminatedPlayers] = useState([]);
  const [turnError, setTurnError] = useState('');
  const [isEliminated, setIsEliminated] = useState(false);
  const [lastEliminated, setLastEliminated] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [lastAIWord, setLastAIWord] = useState(null);
  const [aiAnsweredMsg, setAiAnsweredMsg] = useState(null);
  const timerRef = useRef(null);
  const tttPollRef = useRef(null);

  // TTT-specific state
  const [tttBoard, setTttBoard] = useState(Array(9).fill(''));
  const [tttCurrentSymbol, setTttCurrentSymbol] = useState('X');
  const [tttResult, setTttResult] = useState(null);
  const [tttWinningLine, setTttWinningLine] = useState(null);
  const [tttMoving, setTttMoving] = useState(false);
  const [tttGameOver, setTttGameOver] = useState(null);
  const [tttRematching, setTttRematching] = useState(false);

  const myId = currentUser?._id || currentUser?.id;

  const fetchRoom = useCallback(async () => {
    try {
      let data;
      try {
        data = await API.getGameRoom(roomId);
      } catch {
        data = await API.getTTTRoom(roomId);
      }
      const r = data.room;
      setRoom(r);
      if (r.gameType === 'tic_tac_toe') {
        setTttBoard(r.tttBoard || Array(9).fill(''));
        setTttCurrentSymbol(r.tttCurrentSymbol || 'X');
        setTttResult(r.tttResult || null);
        setTttWinningLine(r.tttWinningLine || null);
        if (r.tttResult) {
          const winner = r.players?.find(p => p.symbol === r.tttResult);
          setTttGameOver({ result: r.tttResult, winnerUsername: winner?.username || null, winningLine: r.tttWinningLine, players: r.players });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    if (room?.status !== 'waiting' || !room?.lastActivity) {
      setTimeUntilClose(null);
      return;
    }

    const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;
    const updateTimer = () => {
      const elapsed = Date.now() - new Date(room.lastActivity).getTime();
      const remaining = INACTIVITY_LIMIT_MS - elapsed;
      setTimeUntilClose(Math.max(0, Math.floor(remaining / 1000)));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 10000);
    return () => clearInterval(timer);
  }, [room?.status, room?.lastActivity]);

  useEffect(() => {
    if (!room?._id) return;

    if (room.gameType === 'tic_tac_toe') {
      socket.emit('joinGame', room._id);
    } else {
      socket.emit('joinGameRoom', room._id);
    }

    const handlePlayerJoined = ({ players, room: updatedRoom }) => {
      if (updatedRoom) setRoom(updatedRoom);
      else setRoom(r => r ? { ...r, players, lastActivity: new Date().toISOString() } : null);
    };

    const handleGameStarted = ({ room: r, round: rd }) => {
      setRoom(r);
      if (rd) setRound(rd);
      setResult(null);
      setGameOver(null);
      setCurrentTurn(null);
      setWordChain([]);
      setIsEliminated(false);
      setLastEliminated(null);
    };

    const handleGuessResult = ({ roundResult, nextRound, gameOver: go }) => {
      if (roundResult) {
        setResult(roundResult);
        setGuess('');
        setRoom(r => r ? { ...r, lastActivity: new Date().toISOString() } : null);
      }
      if (go) {
        setGameOver(go);
      } else if (nextRound) {
        setTimeout(() => {
          setRound(nextRound);
          setResult(null);
          setGuess('');
        }, 3000);
      }
    };

    // WCG events
    const handleWcgTurnStarted = ({ turnNumber, playerId, playerUsername, letter, minWordLength, timeLimitSecs, startedAt, activePlayers: ap, eliminatedPlayers: ep, wordChainSoFar }) => {
      const turnPlayer = room?.players?.find(p => p.userId === playerId || p.username === playerUsername);
      setCurrentTurn({ turnNumber, playerId, playerUsername, letter, minWordLength, timeLimitSecs, startedAt, isAI: turnPlayer?.isAI || false });
      setWordChain(wordChainSoFar || []);
      setWcgActivePlayers(ap || []);
      setWcgEliminatedPlayers(ep || []);
      setTurnError('');
      setLastEliminated(null);
      setLastAIWord(null);
      setAiAnsweredMsg(null);
      setGuess('');
      if (timerRef.current) clearInterval(timerRef.current);
      const getLeft = () => getRemainingSeconds(startedAt, timeLimitSecs);
      setTimeLeft(getLeft());
      timerRef.current = setInterval(() => {
        const left = getLeft();
        setTimeLeft(left);
        if (left <= 0) clearInterval(timerRef.current);
      }, 500);
    };

    const handleWcgWordAccepted = ({ playerUsername, word, wordChainSoFar, score, isAI }) => {
      setWordChain(wordChainSoFar || []);
      setRoom(r => r ? { ...r, players: r.players.map(p => p.username === playerUsername ? { ...p, score } : p) } : null);
      if (isAI && word) {
        setLastAIWord({ username: playerUsername, word });
        setTimeout(() => setLastAIWord(null), 4000);
      }
    };

    const handleAiAnswered = ({ username, isAI, difficulty: diff }) => {
      if (isAI) {
        setAiAnsweredMsg(`🤖 ${username} has answered...`);
        setTimeout(() => setAiAnsweredMsg(null), 4000);
      }
    };

    const handlePlayerEliminated = ({ username, eliminatedPlayers: ep, activePlayers: ap }) => {
      setWcgEliminatedPlayers(ep || []);
      setWcgActivePlayers(ap || []);
      setLastEliminated(username);
      if (username === currentUser.username) {
        setIsEliminated(true);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(null);
        showToast('You ran out of time and have been eliminated!', { type: 'error' });
      } else {
        showToast(`${username} was eliminated — ran out of time!`);
      }
    };

    const handleWcgGameOver = ({ winner, players, wordChain: wc }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameOver({ winner, players, wordChain: wc });
    };

    const handleRoomCancelled = ({ reason }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      showToast(reason, { type: 'error' });
      onClose();
    };

    const handlePlayerKicked = ({ username, players }) => {
      if (currentUser.username === username) {
        showToast('You have been removed from this room by the host', { type: 'error' });
        onClose();
      } else {
        setRoom(r => r ? { ...r, players, lastActivity: new Date().toISOString() } : null);
        showToast(`${username} was removed from the room`);
      }
    };

    const handlePlayerLeft = ({ username, players }) => {
      setRoom(r => r ? { ...r, players, lastActivity: new Date().toISOString() } : null);
      showToast(`${username} left the room`);
    };

    // TTT socket handlers
    const handleTTTMoveMade = ({ board, currentSymbol, result, winningLine, players }) => {
      if (tttPollRef.current) { clearInterval(tttPollRef.current); tttPollRef.current = null; }
      setTttBoard(board || Array(9).fill(''));
      setTttCurrentSymbol(currentSymbol || 'X');
      if (winningLine) setTttWinningLine(winningLine);
      if (result) {
        setTttResult(result);
        setTttGameOver(prev => prev || { result, winnerUsername: null, winningLine: winningLine || null, players: players || [] });
      }
    };

    const handleTTTGameOver = ({ result, winnerUsername, winningLine, board, players }) => {
      if (tttPollRef.current) { clearInterval(tttPollRef.current); tttPollRef.current = null; }
      if (board) setTttBoard(board);
      if (winningLine) setTttWinningLine(winningLine);
      setTttResult(result);
      setTttGameOver({ result, winnerUsername, winningLine, players });
    };

    const handleTTTRematch = ({ newRoomId }) => {
      navigate(`/game/room/${newRoomId}`, { replace: true });
    };

    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameStarted', handleGameStarted);
    socket.on('guessResult', handleGuessResult);
    socket.on('wcgTurnStarted', handleWcgTurnStarted);
    socket.on('wcgWordAccepted', handleWcgWordAccepted);
    socket.on('aiAnswered', handleAiAnswered);
    socket.on('playerEliminated', handlePlayerEliminated);
    socket.on('gameOver', handleWcgGameOver);
    socket.on('roomCancelled', handleRoomCancelled);
    socket.on('playerKicked', handlePlayerKicked);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('tttMoveMade', handleTTTMoveMade);
    socket.on('tttGameOver', handleTTTGameOver);
    socket.on('tttRematch', handleTTTRematch);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (tttPollRef.current) { clearInterval(tttPollRef.current); tttPollRef.current = null; }
      socket.emit('leaveGameRoom', room._id);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameStarted', handleGameStarted);
      socket.off('guessResult', handleGuessResult);
      socket.off('wcgTurnStarted', handleWcgTurnStarted);
      socket.off('wcgWordAccepted', handleWcgWordAccepted);
      socket.off('aiAnswered', handleAiAnswered);
      socket.off('playerEliminated', handlePlayerEliminated);
      socket.off('gameOver', handleWcgGameOver);
      socket.off('roomCancelled', handleRoomCancelled);
      socket.off('playerKicked', handlePlayerKicked);
      socket.off('playerLeft', handlePlayerLeft);
      socket.off('tttMoveMade', handleTTTMoveMade);
      socket.off('tttGameOver', handleTTTGameOver);
      socket.off('tttRematch', handleTTTRematch);
    };
  }, [room?._id, currentUser.username, onClose]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const data = await API.startGame(room._id);
      setRoom(data.room);
      setRound(data.round);
    } catch (err) {
      if (err.message?.includes('at least 2 players')) {
        showToast(err.message);
      } else {
        showToast(err.message || 'Failed to start', { type: 'error' });
      }
    } finally {
      setStarting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to close this room?')) return;
    setDeleting(true);
    try {
      await API.deleteGameRoom(room._id);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to delete room', { type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleLeaveRoom = async () => {
    const msg = room.hostId === myId ? 'Leaving as host will close the room for everyone. Continue?' : 'Are you sure you want to leave?';
    if (!window.confirm(msg)) return;
    setLeaving(true);
    try {
      await API.leaveGameRoom(room._id);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to leave room', { type: 'error' });
    } finally {
      setLeaving(false);
    }
  };

  const handleKickPlayer = async (username) => {
    if (!window.confirm(`Are you sure you want to kick ${username}?`)) return;
    setKicking(username);
    try {
      await API.kickPlayer(room._id, username);
    } catch (err) {
      showToast(err.message || 'Failed to kick player', { type: 'error' });
    } finally {
      setKicking(null);
    }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    if (room?.gameType === 'word_chain') {
      setTurnError('');
      try {
        await API.submitGameGuess(room._id, guess.trim());
        setGuess('');
      } catch (err) {
        // WCG errors are inline — word rejected but turn continues
        setTurnError(err.message || 'Invalid word. Try again!');
        setGuess('');
      } finally {
        setSubmitting(false);
      }
    } else {
      try {
        const data = await API.submitGameGuess(room._id, guess.trim());
        if (!data.roundResult && !data.gameOver) {
          setGuess('');
          setRoom(r => r ? { ...r, lastActivity: new Date().toISOString() } : null);
        }
      } catch (err) {
        showToast(err.message || 'Guess failed', { type: 'error' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleTTTMove = async (cellIndex) => {
    if (tttMoving || tttGameOver) return;
    const myPlayer = room?.players?.find(p => p.userId === myId);
    if (!myPlayer) return;
    if (myPlayer.symbol !== tttCurrentSymbol) return;
    if (tttBoard[cellIndex] !== '') return;
    setTttMoving(true);
    try {
      const data = await API.makeTTTMove(room._id, cellIndex);
      // Apply human move immediately from HTTP response
      setTttBoard(data.board || tttBoard);
      setTttCurrentSymbol(data.currentSymbol || tttCurrentSymbol);
      if (data.result) {
        setTttResult(data.result);
      }

      // If vs AI and game not over, poll for the AI's reply as a fallback
      // (socket tttMoveMade should fire, but polling catches it if socket misses)
      const vsAI = room?.players?.some(p => p.isAI);
      if (vsAI && !data.result) {
        if (tttPollRef.current) clearInterval(tttPollRef.current);
        let attempts = 0;
        const humanSymbol = data.currentSymbol; // AI is now playing, so current = AI's symbol
        tttPollRef.current = setInterval(async () => {
          attempts++;
          try {
            const roomData = await API.getTTTRoom(room._id);
            const r = roomData.room;
            // AI has moved when currentSymbol flips back, or game ended
            const aiMoved = r.tttCurrentSymbol !== humanSymbol || r.tttResult;
            if (aiMoved) {
              clearInterval(tttPollRef.current);
              tttPollRef.current = null;
              setTttBoard(r.tttBoard || Array(9).fill(''));
              setTttCurrentSymbol(r.tttCurrentSymbol || 'X');
              if (r.tttWinningLine) setTttWinningLine(r.tttWinningLine);
              if (r.tttResult) {
                setTttResult(r.tttResult);
                const winner = r.players?.find(p => p.symbol === r.tttResult);
                setTttGameOver({ result: r.tttResult, winnerUsername: winner?.username || null, winningLine: r.tttWinningLine, players: r.players });
              }
            }
          } catch {}
          // Stop polling after 12 seconds regardless
          if (attempts >= 8 && tttPollRef.current) {
            clearInterval(tttPollRef.current);
            tttPollRef.current = null;
          }
        }, 1500);
      }
    } catch (err) {
      showToast(err.message || 'Invalid move', { type: 'error' });
    } finally {
      setTttMoving(false);
    }
  };

  const handleTTTRematch = async () => {
    setTttRematching(true);
    try {
      const data = await API.rematchTTT(room._id);
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      showToast(err.message || 'Failed to start rematch', { type: 'error' });
    } finally {
      setTttRematching(false);
    }
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-discord-bg z-[100] flex items-center justify-center">
        <div className="text-discord-brand animate-spin"><FiRefreshCw size={32} /></div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="fixed inset-0 bg-discord-bg z-[100] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-discord-text mb-2">Room Not Found</h2>
        <p className="text-discord-muted mb-6">{error || 'This game room no longer exists or you do not have access.'}</p>
        <button onClick={onClose} className="discord-btn px-6 py-2.5 rounded-xl font-bold">Back to Games</button>
      </div>
    );
  }

  const isHost = room.hostId === myId;
  const isVsAI = room.players?.some(p => p.isAI);
  const canStart = isHost && room.players?.length >= 2 && room.status === 'waiting' && !isVsAI;
  const gameIcon = room.gameType === 'word_chain' ? '🔗' : room.gameType === 'tic_tac_toe' ? '❌' : '🎭';
  const isWCG = room.gameType === 'word_chain';
  const isTTT = room.gameType === 'tic_tac_toe';
  const myTTTPlayer = isTTT ? room.players?.find(p => p.userId === myId) : null;
  const isMyTTTTurn = isTTT && myTTTPlayer && myTTTPlayer.symbol === tttCurrentSymbol && !tttGameOver;

  return (
    <div className="fixed inset-0 bg-discord-bg z-[100] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-discord-hover flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button onClick={onClose} className="text-discord-muted hover:text-discord-text transition-colors">
            <FiArrowLeft size={20} />
          </button>
          {!isTTT && (
            <button 
              onClick={isHost ? handleDeleteRoom : handleLeaveRoom}
              disabled={room.status === 'in_progress' || deleting || leaving}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed ml-2"
              title={room.status === 'in_progress' ? 'Cannot leave mid-game' : ''}
            >
              {isHost ? <FiX size={14} /> : <FiLogOut size={14} />} {isHost ? 'Close Room' : 'Leave'}
            </button>
          )}
        </div>
        <span className="font-bold text-discord-text flex items-center gap-1.5">
          <TwemojiImg emoji={gameIcon} size={18} />
          {isWCG ? 'Word Chain' : isTTT ? 'Tic-Tac-Toe' : 'Emoji Trivia'}
        </span>
        {room.inviteCode ? (
          <button onClick={copyCode} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-discord-brand/10 text-discord-brand text-xs font-mono font-bold border border-discord-brand/20">
            {copied ? <FiCheck size={12} /> : <FiCopy size={12} />} {room.inviteCode}
          </button>
        ) : <div className="w-16" />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {isTTT ? (
          <div className="space-y-6">
            {/* Players */}
            <div className="flex items-center justify-between gap-2">
              {room.players?.map(p => {
                const isMe = p.userId === myId;
                const isTurn = p.symbol === tttCurrentSymbol && !tttGameOver;
                const isWinner = tttGameOver && tttGameOver.result === p.symbol;
                const isDraw = tttGameOver && tttGameOver.result === 'draw';
                return (
                  <div key={p.userId || p.username} className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all ${isWinner ? 'border-yellow-400 bg-yellow-400/10' : isDraw ? 'border-discord-muted/30 bg-discord-hover/30' : isTurn ? 'border-discord-brand bg-discord-brand/10' : 'border-discord-hover bg-discord-hover/30'}`}>
                    <div className={`text-2xl font-black ${p.symbol === 'X' ? 'text-red-400' : 'text-blue-400'}`}>{p.symbol}</div>
                    <div className="text-xs font-bold text-discord-text flex items-center gap-1">
                      {p.isAI && <TwemojiImg emoji="🤖" size={12} />}
                      @{p.username}{isMe ? ' (you)' : ''}
                    </div>
                    {isWinner && <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Winner!</span>}
                    {isTurn && !tttGameOver && <span className="text-[10px] font-black text-discord-brand uppercase tracking-wider animate-pulse">Your turn</span>}
                  </div>
                );
              })}
            </div>

            {/* Waiting for second player (human vs human) */}
            {room.status === 'waiting' && (
              <div className="bg-discord-brand/5 border border-discord-brand/20 rounded-2xl p-5 text-center space-y-3">
                <FiRefreshCw size={24} className="mx-auto text-discord-brand animate-spin" />
                <p className="text-discord-text font-bold">Waiting for opponent...</p>
                <p className="text-discord-muted text-xs">Share the code in the top bar with your friend</p>
              </div>
            )}

            {/* Board */}
            {room.status !== 'waiting' && (
              <div className="flex flex-col items-center">
                <div className="grid grid-cols-3 gap-2 w-full max-w-[300px]">
                  {tttBoard.map((cell, i) => {
                    const isWinCell = tttWinningLine?.includes(i);
                    const isEmpty = cell === '';
                    const canClick = isEmpty && isMyTTTTurn && !tttMoving && !tttGameOver;
                    return (
                      <button
                        key={i}
                        onClick={() => canClick && handleTTTMove(i)}
                        disabled={!canClick}
                        className={`aspect-square rounded-2xl border-2 text-4xl font-black flex items-center justify-center transition-all active:scale-95 ${
                          isWinCell
                            ? 'border-yellow-400 bg-yellow-400/20 shadow-lg shadow-yellow-400/20'
                            : cell !== '' 
                              ? 'border-discord-hover bg-discord-hover/50 cursor-default'
                              : canClick
                                ? 'border-discord-brand/40 bg-discord-brand/5 hover:bg-discord-brand/15 hover:border-discord-brand cursor-pointer'
                                : 'border-discord-hover/40 bg-discord-hover/20 cursor-default'
                        }`}
                      >
                        {cell === 'X' && <span className={`${isWinCell ? 'text-yellow-400' : 'text-red-400'} drop-shadow`}>✕</span>}
                        {cell === 'O' && <span className={`${isWinCell ? 'text-yellow-400' : 'text-blue-400'} drop-shadow`}>○</span>}
                        {cell === '' && canClick && !tttMoving && <span className="text-discord-brand/20 text-2xl">·</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Status message */}
                <div className="mt-4 text-center">
                  {tttGameOver ? (
                    tttGameOver.result === 'draw' ? (
                      <p className="text-discord-muted font-bold text-lg">It's a draw!</p>
                    ) : (
                      <p className="font-bold text-lg">
                        <span className={tttGameOver.result === 'X' ? 'text-red-400' : 'text-blue-400'}>{tttGameOver.result}</span>
                        {' '}<span className="text-discord-text">wins!</span>
                        {tttGameOver.winnerUsername && <span className="text-discord-muted text-sm block mt-0.5">@{tttGameOver.winnerUsername}</span>}
                      </p>
                    )
                  ) : isMyTTTTurn ? (
                    <p className="text-discord-brand font-bold animate-pulse">Your turn — pick a square</p>
                  ) : tttMoving ? (
                    <p className="text-discord-muted font-bold flex items-center justify-center gap-2"><FiRefreshCw size={14} className="animate-spin" /> Making move...</p>
                  ) : (
                    <p className="text-discord-muted font-bold flex items-center justify-center gap-2">
                      {room.players?.find(p => p.symbol === tttCurrentSymbol)?.isAI
                        ? <><TwemojiImg emoji="🤖" size={14} /> VesselBot is thinking...</>
                        : <><FiRefreshCw size={14} className="animate-spin text-discord-brand" /> Opponent's turn...</>
                      }
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* XP info */}
            {room.status !== 'waiting' && !tttGameOver && (
              <div className="bg-discord-hover/30 border border-discord-hover rounded-xl px-4 py-2 text-center">
                <p className="text-discord-muted text-xs font-semibold">Win +55 XP · Draw/Loss +5 XP</p>
              </div>
            )}

            {/* Game over actions */}
            {tttGameOver && (
              <div className="space-y-3">
                <div className="bg-discord-hover/30 border border-discord-hover rounded-xl px-4 py-3">
                  <p className="text-discord-muted text-xs font-bold uppercase tracking-wider mb-2">Result</p>
                  {room.players?.map(p => {
                    const won = tttGameOver.result === p.symbol;
                    const drew = tttGameOver.result === 'draw';
                    return (
                      <div key={p.userId || p.username} className="flex items-center justify-between py-1.5">
                        <span className="font-bold text-discord-text text-sm flex items-center gap-1.5">
                          {p.isAI && <TwemojiImg emoji="🤖" size={13} />}
                          @{p.username}
                          {p.userId === myId && <span className="text-discord-muted">(you)</span>}
                        </span>
                        <div className="flex items-center gap-2">
                          {drew ? (
                            <span className="text-discord-muted text-xs font-bold">Draw · +5 XP</span>
                          ) : won ? (
                            <span className="text-yellow-400 text-xs font-black">🏆 Win · +55 XP</span>
                          ) : (
                            <span className="text-discord-muted text-xs font-bold">Loss · +5 XP</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isHost && (
                  <button
                    onClick={handleTTTRematch}
                    disabled={tttRematching}
                    className="w-full py-3.5 rounded-2xl font-black text-sm bg-discord-brand text-white shadow-lg hover:bg-discord-brand/90 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw size={16} className={tttRematching ? 'animate-spin' : ''} />
                    {tttRematching ? 'Starting...' : 'Rematch (swap symbols)'}
                  </button>
                )}
                <button onClick={onClose} className="w-full py-3 rounded-2xl border border-discord-hover text-discord-muted text-sm font-bold hover:bg-discord-hover transition-all">
                  Back to Games
                </button>
              </div>
            )}
          </div>
        ) : gameOver ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4 scale-125"><TwemojiImg emoji="🏆" size={64} /></div>
            <h2 className="text-3xl font-black text-discord-text mb-1">Game Over!</h2>
            <p className="text-discord-muted mb-6 text-lg">Winner: <span className="text-discord-brand font-bold">@{gameOver.winner?.username}</span></p>
            {isWCG && gameOver.wordChain?.length > 0 && (
              <div className="mb-6 bg-discord-hover/40 border border-discord-hover rounded-2xl p-4 text-left">
                <p className="text-discord-muted text-[10px] font-black uppercase tracking-wider mb-2">Full Chain ({gameOver.wordChain.length} words)</p>
                <p className="text-discord-text text-sm font-semibold leading-relaxed break-words">{gameOver.wordChain.join(' → ')}</p>
              </div>
            )}
            <div className="space-y-2 mb-8">
              {gameOver.players?.sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.username} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${p.userId === myId ? 'bg-discord-brand/10 border-discord-brand/30' : 'bg-discord-hover/50 border-discord-hover'}`}>
                  <span className={`text-lg font-bold w-6 ${i === 0 ? 'text-yellow-400' : 'text-discord-muted'}`}>{i + 1}</span>
                  <span className="flex-1 font-bold text-discord-text text-left">@{p.username}</span>
                  <span className="font-black text-discord-brand">{p.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="discord-btn w-full py-3.5 rounded-2xl font-bold text-lg shadow-lg">Back to Games</button>
          </div>
        ) : result ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4"><TwemojiImg emoji={result.winnerId ? '✨' : '⏱️'} size={64} /></div>
            <h3 className="text-2xl font-black text-discord-text mb-1">Round {result.roundNumber} Result</h3>
            <p className="text-discord-muted text-lg mb-6">The answer was: <span className="text-discord-text font-bold uppercase tracking-wider">{result.answer}</span></p>
            <div className="space-y-2 mt-4">
              {result.players?.sort((a,b) => b.score - a.score).map(p => (
                <div key={p.username} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${p.userId === result.winnerId ? 'bg-discord-green/10 border-discord-green/30' : 'bg-discord-hover/50 border-discord-hover'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-discord-text">@{p.username}</span>
                    {p.userId === result.winnerId && <span className="bg-discord-green text-white text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Fastest</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.isCorrect && <span className="text-discord-green text-xs font-bold">✓ Correct</span>}
                    <span className="font-black text-discord-brand">{p.score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center">
              <div className="w-12 h-1 bg-discord-hover rounded-full overflow-hidden mb-2">
                 <div className="h-full bg-discord-brand animate-[loading_3s_linear]" />
              </div>
              <p className="text-discord-muted text-sm font-semibold">Next round starting soon...</p>
            </div>
          </div>
        ) : isWCG && currentTurn ? (
          <div className="space-y-4">
            {/* Brief "time's up" banner */}
            {lastEliminated && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                <span>⏰</span> Time's up for @{lastEliminated}!
              </div>
            )}
            {/* AI played a word */}
            {lastAIWord && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-bold">
                <TwemojiImg emoji="🤖" size={16} /> {lastAIWord.username} played: <em>{lastAIWord.word}</em>
              </div>
            )}
            {/* AI answered (Emoji Trivia) */}
            {aiAnsweredMsg && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-bold">
                {aiAnsweredMsg}
              </div>
            )}

            {/* Turn header */}
            <div className="flex items-center justify-between">
              <span className="bg-discord-hover text-discord-text px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Turn {currentTurn.turnNumber}</span>
              <span className={`font-black text-lg tabular-nums ${timeLeft <= 7 ? 'text-red-400' : timeLeft <= 15 ? 'text-yellow-400' : 'text-discord-green'}`}>
                ⏱ {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${String(Math.ceil(timeLeft % 60)).padStart(2, '0')}` : '--'}
              </span>
            </div>

            {/* Word chain so far */}
            <div className="bg-discord-hover/40 border border-discord-hover rounded-2xl p-4">
              <p className="text-discord-muted text-[10px] font-black uppercase tracking-wider mb-2">🔗 Chain so far</p>
              {wordChain.length === 0 ? (
                <p className="text-discord-muted text-sm italic">The chain starts here...</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {wordChain.map((w, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${i === wordChain.length - 1 ? 'bg-discord-brand text-white' : 'bg-discord-hover text-discord-text'}`}>{w}</span>
                      {i < wordChain.length - 1 && <span className="text-discord-muted text-xs">→</span>}
                    </span>
                  ))}
                </div>
              )}
              {wordChain.length > 0 && (
                <p className="text-discord-muted text-xs mt-2">Next word must start with <span className="text-discord-brand font-black">"{currentTurn.letter}"</span></p>
              )}
            </div>

            {/* Active player input or watching */}
            {currentTurn.playerId === myId && !isEliminated ? (
              <div className="bg-discord-brand/5 border border-discord-brand/20 rounded-2xl p-4">
                <p className="text-discord-brand text-xs font-black uppercase tracking-wider mb-3">🎯 Your turn!</p>
                <p className="text-discord-text text-sm mb-3">
                  Type a word starting with <span className="font-black text-discord-brand">"{currentTurn.letter}"</span>, at least <span className="font-black text-discord-brand">{currentTurn.minWordLength} letters</span>
                </p>
                <form onSubmit={handleGuess} className="flex gap-2">
                  <input
                    type="text"
                    value={guess}
                    onChange={e => setGuess(e.target.value.toLowerCase())}
                    placeholder={`${currentTurn.letter.toLowerCase()}...`}
                    className="discord-input flex-1 text-lg font-bold"
                    autoFocus
                    disabled={submitting}
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                  <button type="submit" disabled={!guess.trim() || submitting} className="bg-discord-brand text-white px-5 rounded-xl disabled:opacity-50 font-bold hover:bg-discord-brand/90 active:scale-95 transition-all">
                    {submitting ? '...' : 'Send'}
                  </button>
                </form>
                {turnError && (
                  <p className="mt-2 text-red-400 text-sm font-semibold flex items-center gap-1.5">❌ {turnError}</p>
                )}
              </div>
            ) : isEliminated ? (
              <div className="bg-discord-hover/50 border border-discord-hover rounded-2xl p-4 text-center opacity-70">
                <p className="text-discord-muted text-sm font-bold">You've been eliminated — watching the game</p>
                <p className="text-discord-muted text-xs mt-1">@{currentTurn.playerUsername}'s turn...</p>
              </div>
            ) : (
              <div className={`border rounded-2xl p-4 text-center ${currentTurn.isAI ? 'bg-purple-500/5 border-purple-500/20' : 'bg-discord-hover/50 border-discord-hover'}`}>
                <div className="flex items-center justify-center gap-2 text-discord-text font-bold mb-1">
                  {currentTurn.isAI
                    ? <><TwemojiImg emoji="🤖" size={16} /> {currentTurn.playerUsername} is calculating...</>
                    : <><FiRefreshCw size={14} className="animate-spin text-discord-brand" /> @{currentTurn.playerUsername} is thinking...</>
                  }
                </div>
                <p className="text-discord-muted text-xs">Start with <span className="font-bold text-discord-brand">"{currentTurn.letter}"</span>, min {currentTurn.minWordLength} letters</p>
              </div>
            )}

            {/* Player list */}
            <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-discord-hover/50 border-b border-discord-hover">
                <span className="text-[10px] font-black text-discord-muted uppercase tracking-wider">Players</span>
              </div>
              <div className="divide-y divide-discord-hover">
                {room.players?.map(p => {
                  const isActive = wcgActivePlayers.includes(p.username);
                  const isCurrentTurnPlayer = p.username === currentTurn.playerUsername;
                  const isMe = p.userId === myId || p.username === currentUser.username;
                  return (
                    <div key={p.userId} className={`flex items-center gap-3 px-4 py-2.5 ${isCurrentTurnPlayer ? 'bg-discord-brand/5' : ''}`}>
                      <span className="text-sm w-5 flex-shrink-0">
                        {!isActive ? '❌' : isCurrentTurnPlayer ? '🎯' : '✅'}
                      </span>
                      <span className={`flex-1 text-sm font-bold flex items-center gap-1 ${!isActive ? 'text-discord-muted line-through' : 'text-discord-text'}`}>
                        {p.isAI && <TwemojiImg emoji="🤖" size={14} />}
                        @{p.username}{isMe ? ' (you)' : ''}
                        {p.isAI && p.aiDifficulty && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold ml-1 normal-case">{p.aiDifficulty}</span>
                        )}
                      </span>
                      <span className={`text-sm font-black ${isCurrentTurnPlayer ? 'text-discord-brand' : 'text-discord-muted'}`}>{p.score ?? 0} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : round ? (
          <div className="text-center">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-discord-hover text-discord-text px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Round {round.roundNumber} / {room.totalRounds}</span>
              <div className="flex items-center gap-1.5 text-discord-muted font-bold text-sm">
                <FiRefreshCw size={14} className="animate-spin" /> Live
              </div>
            </div>
            <div className="bg-discord-hover/50 border border-discord-hover rounded-3xl p-8 mb-8 shadow-inner">
              <div className="flex justify-center gap-3 flex-wrap">
                {round.emojis?.map((e, i) => <TwemojiImg key={i} emoji={e} size={64} className="drop-shadow-lg transition-transform hover:scale-110" />)}
              </div>
            </div>
            <form onSubmit={handleGuess} className="flex gap-2 p-1.5 bg-discord-hover rounded-2xl border border-discord-hover focus-within:border-discord-brand/50 transition-all">
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Type your guess..."
                className="bg-transparent border-none text-discord-text px-4 py-3 flex-1 focus:ring-0 font-semibold placeholder:text-discord-muted/50"
                autoFocus
                disabled={submitting}
              />
              <button type="submit" disabled={!guess.trim() || submitting} className="bg-discord-brand text-white p-3 rounded-xl disabled:opacity-50 hover:bg-discord-brand/90 transition-all shadow-md active:scale-90">
                <FiPlay size={20} />
              </button>
            </form>
            <p className="mt-4 text-[11px] text-discord-muted font-bold uppercase tracking-widest">Type fast to earn extra points!</p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4 scale-125"><TwemojiImg emoji="🎮" size={64} /></div>
              <h2 className="text-2xl font-black text-discord-text">Waiting Area</h2>
              <p className="text-discord-muted text-sm mt-1 max-w-[250px] mx-auto leading-relaxed">Share the invite code with your squad to start the battle!</p>
              
              {timeUntilClose !== null && timeUntilClose < 120 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-red-400 font-bold text-xs uppercase animate-pulse">
                  <FiClock size={14} /> Room closes in ~{Math.floor(timeUntilClose / 60)}m {timeUntilClose % 60}s
                </div>
              )}
            </div>
            
            <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl overflow-hidden mb-8">
              <div className="px-4 py-2 bg-discord-hover/50 border-b border-discord-hover flex justify-between items-center">
                <span className="text-[10px] font-black text-discord-muted uppercase tracking-wider">
                  {room.players?.length || 0} {isVsAI ? 'players' : `/ ${room.maxPlayers || 8} players`}
                </span>
                <span className="text-[10px] font-black text-discord-brand uppercase tracking-wider">
                  {isVsAI ? 'VS AI Match' : room.players?.length < 2 ? 'Waiting for players...' : 'Ready to start!'}
                </span>
              </div>
              <div className="divide-y divide-discord-hover">
                {room.players?.map((p, i) => (
                  <div key={p.userId || i} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-discord-hover/20 group">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 ${p.isAI ? 'bg-purple-500/20 border-purple-500/20 text-purple-400' : 'bg-discord-brand/20 border-discord-brand/10 text-discord-brand'}`}>
                      {p.isAI ? <TwemojiImg emoji="🤖" size={20} /> : (p.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-discord-text text-sm flex items-center gap-1.5">
                        {p.isAI && <TwemojiImg emoji="🤖" size={14} />}
                        @{p.username}
                      </p>
                      <p className="text-[10px] text-discord-muted font-semibold">
                        {p.isAI ? `AI · ${p.aiDifficulty || ''} difficulty` : i === 0 ? 'Room Leader' : 'Challenger'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.isAI ? (
                        <span className="bg-purple-500/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Bot</span>
                      ) : i === 0 ? (
                        <span className="bg-discord-brand text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Host</span>
                      ) : p.userId === myId ? (
                        <span className="bg-discord-muted text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">You</span>
                      ) : isHost && !isVsAI && (
                        <button
                          onClick={() => handleKickPlayer(p.username)}
                          disabled={kicking === p.username}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-discord-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Kick Player"
                        >
                          {kicking === p.username ? <FiRefreshCw size={14} className="animate-spin" /> : <FiUserX size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isVsAI ? (
              <div className="text-center p-6 bg-discord-brand/5 border border-discord-brand/20 rounded-2xl">
                <FiRefreshCw size={24} className="mx-auto text-discord-brand animate-spin mb-3" />
                <p className="text-discord-text font-bold">Game is starting...</p>
                <p className="text-discord-muted text-xs mt-1">VesselBot is getting ready to play!</p>
              </div>
            ) : canStart ? (
              <button onClick={handleStart} disabled={starting} className="discord-btn w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-discord-brand/20 hover:shadow-discord-brand/40 active:scale-95 transition-all">
                {starting ? 'Initializing...' : <span className="flex items-center justify-center gap-2"><TwemojiImg emoji="🚀" size={20} /> Launch Game</span>}
              </button>
            ) : isHost ? (
               <div className="space-y-4">
                 <div className="p-4 bg-discord-brand/10 border border-discord-brand/20 rounded-2xl text-center">
                   <p className="text-discord-brand text-xs font-bold uppercase tracking-wider mb-2">Need at least 2 players to start</p>
                   <button 
                     onClick={copyCode}
                     className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-discord-brand text-white text-sm font-bold shadow-md hover:bg-discord-brand/90 transition-all active:scale-95"
                   >
                     {copied ? <FiCheck size={14} /> : <FiCopy size={14} />} 
                     {copied ? 'Code Copied!' : 'Copy Invite Code'}
                   </button>
                 </div>
                 <button 
                   disabled 
                   className="discord-btn w-full py-4 rounded-2xl font-black text-lg opacity-50 cursor-not-allowed"
                 >
                   Launch Game
                 </button>
               </div>
            ) : (
              <div className="text-center p-4 bg-discord-hover/50 rounded-2xl border border-discord-hover">
                <FiRefreshCw size={20} className="mx-auto text-discord-brand animate-spin mb-2" />
                <p className="text-discord-text text-sm font-bold">Waiting for host to start...</p>
                <p className="text-discord-muted text-[11px] mt-1 font-semibold uppercase tracking-widest">Get ready!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Games({ currentUser, unreadCounts }) {
  const { mode, inviteCode, roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState('play');
  const [myRooms, setMyRooms] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showVsAI, setShowVsAI] = useState(false);
  const [showTTT, setShowTTT] = useState(false);

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
  }, [tab, loadPlayData, loadLeaderboard]);

  // Handle path segments if we are using the new nested routes
  const isCreate = location.pathname === '/game/create';
  const isJoin = location.pathname.startsWith('/game/join');
  const isRoom = location.pathname.startsWith('/game/room');

  if (isRoom && roomId) {
    return (
      <RoomLobby
        roomId={roomId}
        currentUser={currentUser}
        onClose={() => { navigate('/game', { replace: true }); loadPlayData(); }}
      />
    );
  }

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-y-auto scrollable mobile-content-pad">
      {isCreate && (
        <CreateGameModal onClose={() => navigate('/game', { replace: true })} />
      )}
      {isJoin && (
        <JoinModal inviteCode={inviteCode} onClose={() => navigate('/game', { replace: true })} />
      )}
      {showVsAI && (
        <VsAIModal onClose={() => setShowVsAI(false)} />
      )}
      {showTTT && (
        <TicTacToeModal currentUser={currentUser} onClose={() => setShowTTT(false)} />
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
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button onClick={() => navigate('/game/create')}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-discord-brand text-white font-bold shadow-lg hover:bg-discord-brand/90 active:scale-95 transition-all">
                <FiPlus size={18} /> Create Game
              </button>
              <button onClick={() => navigate('/game/join')}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-discord-brand text-discord-brand font-bold hover:bg-discord-brand/10 active:scale-95 transition-all">
                <FiHash size={18} /> Join with Code
              </button>
            </div>
            <button
              onClick={() => setShowTTT(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-discord-hover/80 border border-discord-hover hover:border-discord-brand/40 text-discord-text font-bold mb-6 active:scale-95 transition-all relative"
            >
              <TwemojiImg emoji="❌" size={20} /> Tic-Tac-Toe
              <span className="absolute right-3 text-[10px] font-bold bg-discord-green/20 text-discord-green px-2 py-0.5 rounded-full">New</span>
            </button>

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
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-discord-bg rounded-xl p-2">
                    <p className="font-bold text-discord-text">{myStats.gameStats?.wordChainWins || 0}</p>
                    <p className="text-discord-muted text-[11px] flex items-center justify-center gap-1"><TwemojiImg emoji="🔗" size={12} /> Word Chain</p>
                  </div>
                  <div className="bg-discord-bg rounded-xl p-2">
                    <p className="font-bold text-discord-text">{myStats.gameStats?.emojiTriviaWins || 0}</p>
                    <p className="text-discord-muted text-[11px] flex items-center justify-center gap-1"><TwemojiImg emoji="🎭" size={12} /> Emoji Trivia</p>
                  </div>
                  <div className="bg-discord-bg rounded-xl p-2">
                    <p className="font-bold text-discord-text">{myStats.gameStats?.ticTacToeWins || 0}</p>
                    <p className="text-discord-muted text-[11px] flex items-center justify-center gap-1"><TwemojiImg emoji="❌" size={12} /> Tic-Tac-Toe</p>
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
                    <RoomCard key={room._id} room={room} currentUserId={myId} />
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
                <div className="w-9 h-9 rounded-full bg-discord-brand/20 flex items-center justify-center font-bold text-sm text-discord-brand flex-shrink-0 overflow-hidden border-2 border-discord-brand/10">
                  {entry.profilePicture
                    ? <img src={API.getAvatarUrl(entry.profilePicture, 72)} className="w-full h-full object-cover" alt={entry.username} />
                    : (entry.name || entry.username)[0].toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-discord-text text-sm truncate">{entry.name || entry.username}</p>
                  <p className="text-discord-muted text-xs">Lv.{entry.level} · {entry.xp} XP</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-discord-brand text-sm">{(entry.gameStats?.wordChainWins || 0) + (entry.gameStats?.emojiTriviaWins || 0)}</p>
                  <p className="text-discord-muted text-[11px] font-bold uppercase">wins</p>
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

