import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiPlus, FiHash, FiZap, FiUsers, FiTrendingUp, FiPlay, FiRefreshCw, FiCopy, FiCheck, FiArrowLeft } from 'react-icons/fi';
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

function CreateGameModal({ onClose }) {
  const navigate = useNavigate();
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
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      alert(err.message || 'Failed to create room');
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

function JoinModal({ onClose, inviteCode = '' }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(inviteCode);
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const data = await API.joinGameRoom(code.trim().toUpperCase());
      navigate(`/game/room/${data.room._id}`, { replace: true });
    } catch (err) {
      alert(err.message || 'Invalid invite code');
      if (inviteCode) onClose(); // Close if we were trying to join from URL and it failed
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
  const gameIcon = room.gameType === 'word_sprint' ? '🔤' : '🎭';
  const gameName = room.gameType === 'word_sprint' ? 'Word Sprint' : 'Emoji Trivia';

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
        <span>{room.totalRounds} rounds</span>
        {isHost && <span className="text-discord-brand font-semibold">Host</span>}
      </div>
    </div>
  );
}

function RoomLobby({ roomId, currentUser, onClose }) {
  const [room, setRoom] = useState(null);
  const [round, setRound] = useState(null);
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const myId = currentUser?._id || currentUser?.id;

  const fetchRoom = useCallback(async () => {
    try {
      const data = await API.getGameRoom(roomId);
      setRoom(data.room);
      // Check if there's an ongoing round
      if (data.room.status === 'in_progress' && data.room.rounds?.length > 0) {
        const lastRound = data.room.rounds[data.room.rounds.length - 1];
        if (!lastRound.endedAt) {
          // Reconstruct round payload if possible, or wait for next event
          // For now we just show waiting if we don't have full round data
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
    if (!room?._id) return;

    socket.emit('joinGameRoom', room._id);

    const handlePlayerJoined = ({ players }) => {
      setRoom(r => r ? { ...r, players } : null);
    };

    const handleGameStarted = ({ room: r, round: rd }) => {
      setRoom(r);
      setRound(rd);
      setResult(null);
      setGameOver(null);
    };

    const handleGuessResult = ({ roundResult, nextRound, gameOver: go }) => {
      if (roundResult) {
        setResult(roundResult);
        setGuess('');
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

    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameStarted', handleGameStarted);
    socket.on('guessResult', handleGuessResult);

    return () => {
      socket.emit('leaveGameRoom', room._id);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameStarted', handleGameStarted);
      socket.off('guessResult', handleGuessResult);
    };
  }, [room?._id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const data = await API.startGame(room._id);
      // Room state will be updated via socket, but we set it here too for speed
      setRoom(data.room);
      setRound(data.round);
    } catch (err) {
      alert(err.message || 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const handleGuess = async (e) => {
    e.preventDefault();
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await API.submitGameGuess(room._id, guess.trim());
      // Most of the state update happens via socket guessResult
      if (!data.roundResult && !data.gameOver) {
         setGuess('');
      }
    } catch (err) {
      alert(err.message || 'Guess failed');
    } finally {
      setSubmitting(false);
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

  const isHost = room.players?.[0]?.userId === myId;
  const canStart = isHost && room.players?.length >= 2 && room.status === 'waiting';
  const gameIcon = room.gameType === 'word_sprint' ? '🔤' : '🎭';

  return (
    <div className="fixed inset-0 bg-discord-bg z-[100] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-discord-hover flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-discord-muted hover:text-discord-text text-sm font-semibold transition-colors">
          <FiArrowLeft size={16} /> Back
        </button>
        <span className="font-bold text-discord-text flex items-center gap-1.5">
          <TwemojiImg emoji={gameIcon} size={18} /> 
          {room.gameType === 'word_sprint' ? 'Word Sprint' : 'Emoji Trivia'}
        </span>
        <button onClick={copyCode} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-discord-brand/10 text-discord-brand text-xs font-mono font-bold border border-discord-brand/20">
          {copied ? <FiCheck size={12} /> : <FiCopy size={12} />} {room.inviteCode}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {gameOver ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4 scale-125"><TwemojiImg emoji="🏆" size={64} /></div>
            <h2 className="text-3xl font-black text-discord-text mb-1">Game Over!</h2>
            <p className="text-discord-muted mb-8 text-lg">Winner: <span className="text-discord-brand font-bold">@{gameOver.winner?.username}</span></p>
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
        ) : round ? (
          <div className="text-center">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-discord-hover text-discord-text px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Round {round.roundNumber} / {room.totalRounds}</span>
              <div className="flex items-center gap-1.5 text-discord-muted font-bold text-sm">
                <FiRefreshCw size={14} className="animate-spin" /> Live
              </div>
            </div>
            <div className="bg-discord-hover/50 border border-discord-hover rounded-3xl p-8 mb-8 shadow-inner">
              {room.gameType === 'emoji_trivia' ? (
                <div className="flex justify-center gap-3 flex-wrap">
                  {round.emojis?.map((e, i) => <TwemojiImg key={i} emoji={e} size={64} className="drop-shadow-lg transition-transform hover:scale-110" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-discord-text font-bold text-xl leading-relaxed">{round.prompt}</p>
                  <div className="flex justify-center gap-1">
                    {[...Array(round.wordLength)].map((_, i) => (
                      <div key={i} className="w-8 h-10 border-b-4 border-discord-brand/40 bg-discord-brand/5 flex items-center justify-center text-xl font-black text-discord-text">
                        {i === 0 ? round.startLetter : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={handleGuess} className="flex gap-2 p-1.5 bg-discord-hover rounded-2xl border border-discord-hover focus-within:border-discord-brand/50 transition-all">
              <input
                type="text"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder={room.gameType === 'emoji_trivia' ? 'Type your guess...' : 'Type the word...'}
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
            </div>
            
            <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl overflow-hidden mb-8">
              <div className="px-4 py-2 bg-discord-hover/50 border-b border-discord-hover flex justify-between items-center">
                <span className="text-[10px] font-black text-discord-muted uppercase tracking-wider">Players ({room.players?.length || 0})</span>
                <span className="text-[10px] font-black text-discord-brand uppercase tracking-wider">{room.maxPlayers - (room.players?.length || 0)} slots left</span>
              </div>
              <div className="divide-y divide-discord-hover">
                {room.players?.map((p, i) => (
                  <div key={p.userId || i} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-discord-hover/20">
                    <div className="w-9 h-9 rounded-full bg-discord-brand/20 flex items-center justify-center text-discord-brand font-black text-sm border-2 border-discord-brand/10">
                      {(p.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-discord-text text-sm">@{p.username}</p>
                      <p className="text-[10px] text-discord-muted font-semibold">{i === 0 ? 'Room Leader' : 'Challenger'}</p>
                    </div>
                    {i === 0 ? (
                      <span className="bg-discord-brand text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Host</span>
                    ) : p.userId === myId ? (
                      <span className="bg-discord-muted text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">You</span>
                    ) : null}
                  </div>
                ))}
                {room.players?.length < 2 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-discord-muted text-xs font-semibold animate-pulse italic">Waiting for at least 1 more challenger...</p>
                  </div>
                )}
              </div>
            </div>

            {canStart ? (
              <button onClick={handleStart} disabled={starting} className="discord-btn w-full py-4 rounded-2xl font-black text-lg shadow-xl shadow-discord-brand/20 hover:shadow-discord-brand/40 active:scale-95 transition-all">
                {starting ? 'Initializing...' : <span className="flex items-center justify-center gap-2"><TwemojiImg emoji="🚀" size={20} /> Launch Game</span>}
              </button>
            ) : isHost ? (
               <div className="p-4 bg-discord-brand/10 border border-discord-brand/20 rounded-2xl text-center">
                 <p className="text-discord-brand text-xs font-bold uppercase tracking-wider">Need at least 2 players to start</p>
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
              <button onClick={() => navigate('/game/create')}
                className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-discord-brand text-white font-bold shadow-lg hover:bg-discord-brand/90 active:scale-95 transition-all">
                <FiPlus size={18} /> Create Game
              </button>
              <button onClick={() => navigate('/game/join')}
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
                  <p className="font-bold text-discord-brand text-sm">{entry.gameStats?.wordSprintWins + entry.gameStats?.emojiTriviaWins || 0}</p>
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

