import React, { useState, useEffect, useRef } from 'react';
import { getTwemojiUrl } from '../utils/emoji';
import Avatar from './Avatar';

export default function ReactionsModal({ reactions, currentUser, knownUsers = [], onReact, onClose, initialEmoji }) {
  const [activeTab, setActiveTab] = useState(initialEmoji || 'all');
  const sheetRef = useRef(null);
  const myId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const allUsers = knownUsers.reduce((acc, u) => {
    const id = u?._id || u?.id;
    if (id) acc[id] = u;
    return acc;
  }, {});

  const resolveUser = (id) => {
    if (typeof id === 'object' && id !== null) return id;
    return allUsers[id] || { _id: id, username: id, name: id };
  };

  const emojiEntries = Object.entries(reactions || {}).filter(([, users]) => Array.isArray(users) && users.length > 0);

  const totalCount = emojiEntries.reduce((sum, [, users]) => sum + users.length, 0);

  const activeUsers = activeTab === 'all'
    ? emojiEntries.flatMap(([emoji, users]) => users.map(uid => ({ uid, emoji })))
    : (reactions[activeTab] || []).map(uid => ({ uid, emoji: activeTab }));

  const isMineReacting = (emoji) => {
    const users = reactions[emoji] || [];
    return users.some(u => (u?._id || u?.id || u) === myId);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-[#111214] rounded-t-3xl overflow-hidden shadow-2xl animate-slide-up"
        style={{ maxHeight: '75vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pt-2 pb-3 border-b border-white/8">
          <p className="text-discord-text font-bold text-base">
            {totalCount} {totalCount === 1 ? 'reaction' : 'reactions'}
          </p>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-white/8 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
              activeTab === 'all'
                ? 'bg-discord-brand text-white'
                : 'bg-white/8 text-discord-muted hover:bg-white/12'
            }`}
          >
            <span className="text-base">🙂</span>
            <span>{totalCount}</span>
          </button>

          {emojiEntries.map(([emoji, users]) => (
            <button
              key={emoji}
              onClick={() => setActiveTab(emoji)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                activeTab === emoji
                  ? 'bg-discord-brand text-white'
                  : 'bg-white/8 text-discord-muted hover:bg-white/12'
              }`}
            >
              <img src={getTwemojiUrl(emoji)} alt={emoji} width={18} height={18} className="object-contain select-none" draggable={false} />
              <span>{users.length}</span>
            </button>
          ))}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 140px)' }}>
          {activeUsers.length === 0 ? (
            <div className="py-10 text-center text-discord-muted text-sm">No reactions yet</div>
          ) : (
            activeUsers.map(({ uid, emoji }, i) => {
              const rawId = typeof uid === 'object' ? (uid?._id || uid?.id) : uid;
              const isMe = rawId === myId;
              const user = resolveUser(uid);
              const myReactedThisEmoji = isMe && isMineReacting(emoji);

              return (
                <div
                  key={`${rawId}-${emoji}-${i}`}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-white/4 last:border-0 transition-colors ${
                    myReactedThisEmoji ? 'hover:bg-white/5 cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (myReactedThisEmoji) {
                      onReact(emoji);
                      onClose();
                    }
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar user={user} size={44} />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center">
                      <img src={getTwemojiUrl(emoji)} alt={emoji} width={18} height={18} className="object-contain" draggable={false} />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-discord-text text-sm truncate">
                      {isMe ? 'You' : (user.name || user.username || 'Unknown')}
                    </p>
                    {myReactedThisEmoji && (
                      <p className="text-discord-muted text-xs">Tap to remove</p>
                    )}
                    {!isMe && user.username && (
                      <p className="text-discord-muted text-xs">@{user.username}</p>
                    )}
                  </div>

                  <img
                    src={getTwemojiUrl(emoji)}
                    alt={emoji}
                    width={28}
                    height={28}
                    className="object-contain select-none flex-shrink-0"
                    draggable={false}
                  />
                </div>
              );
            })
          )}
          <div className="h-safe-bottom h-6" />
        </div>
      </div>
    </div>
  );
}
