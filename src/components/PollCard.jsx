import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiClock, FiCheck } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import API from '../utils/api';
import socket from '../utils/socket';

export default function PollCard({ poll, postId, currentUser }) {
  const [pollData, setPollData] = useState(poll);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!postId) return;
    const handler = (e) => {
      const { postId: pid, poll: updatedPoll } = e.detail || {};
      if (pid === postId && updatedPoll) setPollData(updatedPoll);
    };
    window.addEventListener('pollVoteUpdate', handler);
    return () => window.removeEventListener('pollVoteUpdate', handler);
  }, [postId]);

  // Also listen via socket.io directly for real-time updates
  useEffect(() => {
    const handler = (data) => {
      if (data?.postId === postId && data?.poll) {
        setPollData(data.poll);
        window.dispatchEvent(new CustomEvent('pollVoteUpdate', { detail: data }));
      }
    };
    socket.on('pollVoteUpdate', handler);
    return () => socket.off('pollVoteUpdate', handler);
  }, [postId]);

  if (!pollData) return null;

  const { question, options = [], expiresAt, allowMultiple } = pollData;
  const now = Date.now();
  const isExpired = expiresAt && new Date(expiresAt).getTime() < now;
  const totalVotes = options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  const myId = currentUser?._id || currentUser?.id;
  const myVotedIds = options
    .filter(o => o.votes?.some(v => (v._id || v) === myId))
    .map(o => o._id);
  const hasVoted = myVotedIds.length > 0;

  const handleVote = async (optionId) => {
    if (isExpired || voting) return;
    if (!allowMultiple && hasVoted) return; // single-vote: already voted
    setVoting(true);
    try {
      const data = await API.votePoll(postId, [optionId]);
      if (data?.poll) setPollData(data.poll);
    } catch { /* swallow */ }
    finally { setVoting(false); }
  };

  const getPercent = (option) => {
    if (!totalVotes) return 0;
    return Math.round(((option.votes?.length || 0) / totalVotes) * 100);
  };

  return (
    <div className="mx-3 mb-3 bg-discord-dark/60 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-start gap-2 mb-2">
          <FiBarChart2 size={15} className="text-discord-brand mt-0.5 flex-shrink-0" />
          <p className="text-discord-text font-semibold text-sm leading-snug">{question}</p>
        </div>
        {expiresAt && (
          <p className="text-discord-muted text-[11px] flex items-center gap-1 mb-2">
            <FiClock size={10} />
            {isExpired
              ? 'Poll ended'
              : `Ends ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`}
          </p>
        )}
      </div>

      <div className="px-3 pb-3 space-y-2">
        {options.map(option => {
          const pct = getPercent(option);
          const voted = myVotedIds.includes(option._id);
          const showResults = hasVoted || isExpired;
          return (
            <button
              key={option._id}
              disabled={isExpired || (hasVoted && !allowMultiple)}
              onClick={() => handleVote(option._id)}
              className={`relative w-full text-left rounded-xl px-3 py-2.5 border transition-all overflow-hidden ${
                voted
                  ? 'border-discord-brand bg-discord-brand/15'
                  : isExpired || hasVoted
                  ? 'border-white/8 bg-white/3 cursor-default'
                  : 'border-white/10 bg-white/4 hover:border-discord-brand/50 hover:bg-discord-brand/8 active:scale-[0.98]'
              }`}
            >
              {/* Progress bar background */}
              {showResults && (
                <div
                  className="absolute inset-0 rounded-xl transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: voted
                      ? 'rgba(88,101,242,0.20)'
                      : 'rgba(255,255,255,0.06)',
                  }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${voted ? 'text-discord-brand' : 'text-discord-text'}`}>
                  {option.text}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {voted && <FiCheck size={12} className="text-discord-brand" />}
                  {showResults && (
                    <span className={`text-xs font-bold ${voted ? 'text-discord-brand' : 'text-discord-muted'}`}>
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-3 text-[11px] text-discord-muted flex items-center gap-3">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {allowMultiple && <span>· Select multiple</span>}
      </div>
    </div>
  );
}
