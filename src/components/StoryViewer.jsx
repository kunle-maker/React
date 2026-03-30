import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import API from '../utils/api';

const QUICK_EMOJIS = ['❤️', '😂', '🔥', '😍', '😮', '👏'];
const STORY_DURATION = 5000;

export default function StoryViewer({ groups, startGroupIndex = 0, currentUser, onClose, onReload }) {
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reactSent, setReactSent] = useState(null);
  const [showActions, setShowActions] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  const group = groups[groupIdx];
  const stories = group?.stories || [];
  const story = stories[storyIdx];
  const myId = currentUser?._id || currentUser?.id;
  const isMyStory = story?.userId === myId || story?.userId?._id === myId;

  const goNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx < stories.length - 1) {
      setStoryIdx(i => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, stories.length, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, groupIdx]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    const tick = 50;
    startTimeRef.current = Date.now() - elapsedRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        goNext();
      }
    }, tick);
  }, [goNext]);

  const pauseTimer = useCallback(() => {
    clearInterval(timerRef.current);
    elapsedRef.current = Date.now() - (startTimeRef.current || Date.now());
  }, []);

  useEffect(() => {
    if (paused) {
      pauseTimer();
    } else {
      startTimer();
    }
    return () => clearInterval(timerRef.current);
  }, [story?._id, paused, startTimer, pauseTimer]);

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setReactSent(null);
    setShowActions(false);
    if (story?._id && !story?.isViewed && !isMyStory) {
      API.viewStory(story._id).catch(() => {});
    }
  }, [story?._id]);

  const handleReact = async (emoji) => {
    if (!story?._id || isMyStory) return;
    try {
      await API.reactToStory(story._id, emoji);
      setReactSent(emoji);
      setTimeout(() => setReactSent(null), 2000);
    } catch {}
  };

  const handleDelete = async () => {
    if (!story?._id) return;
    try {
      await API.deleteStory(story._id);
      onReload?.();
      goNext();
    } catch {}
    setShowActions(false);
  };

  if (!story) { onClose(); return null; }

  const user = group?.user;
  const avatarSrc = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, 80) : null;
  const avatarName = user?.name || user?.username || '?';
  const avatarColors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4'];
  const avatarBg = avatarColors[(avatarName?.charCodeAt(0) || 0) % avatarColors.length];
  const timeAgo = story.createdAt ? formatDistanceToNow(new Date(story.createdAt), { addSuffix: true }) : '';

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center" onClick={() => setShowActions(false)}>
      <div className="relative w-full max-w-sm h-full bg-black overflow-hidden flex flex-col">

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                  transition: i === storyIdx ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-2.5 px-3 pt-2">
          {avatarSrc ? (
            <img src={avatarSrc} alt={avatarName} className="w-9 h-9 rounded-full object-cover border-2 border-white flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold border-2 border-white flex-shrink-0 text-base" style={{ backgroundColor: avatarBg }}>
              {avatarName[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight truncate">{user?.username || user?.name}</p>
            <p className="text-white/60 text-[11px]">{timeAgo}</p>
          </div>
          {isMyStory && (
            <button
              className="text-white/80 hover:text-white p-1"
              onClick={e => { e.stopPropagation(); setShowActions(v => !v); }}
            >
              <FiMoreVertical size={20} />
            </button>
          )}
          <button className="text-white/80 hover:text-white p-1" onClick={onClose}>
            <FiX size={22} />
          </button>
        </div>

        {/* Actions dropdown */}
        {showActions && isMyStory && (
          <div className="absolute top-[72px] right-3 z-30 bg-[#1a1b1e] rounded-xl shadow-2xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
            <button
              className="flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-white/5 text-sm w-full text-left"
              onClick={handleDelete}
            >
              <FiTrash2 size={14} /> Delete story
            </button>
          </div>
        )}

        {/* Story content */}
        <div
          className="flex-1 relative select-none"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.mediaType === 'video' ? (
            <video
              key={story._id}
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              autoPlay muted playsInline loop
            />
          ) : (
            <img
              key={story._id}
              src={story.mediaUrl}
              alt="story"
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}

          {/* Nav zones (invisible) */}
          <button
            className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0"
            onMouseDown={e => { e.stopPropagation(); goPrev(); }}
            onTouchEnd={e => { e.stopPropagation(); goPrev(); }}
          />
          <button
            className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0"
            onMouseDown={e => { e.stopPropagation(); goNext(); }}
            onTouchEnd={e => { e.stopPropagation(); goNext(); }}
          />
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-24 left-0 right-0 px-4 z-10 pointer-events-none">
            <p className="text-white text-sm text-center bg-black/40 rounded-xl px-3 py-2 backdrop-blur-sm">
              {story.caption}
            </p>
          </div>
        )}

        {/* View count (my stories) */}
        {isMyStory && typeof story.viewCount === 'number' && (
          <div className="absolute bottom-6 left-4 flex items-center gap-1 text-white/80 text-sm z-10">
            👁 {story.viewCount} view{story.viewCount !== 1 ? 's' : ''}
          </div>
        )}

        {/* Reaction bar */}
        {!isMyStory && (
          <div className="absolute bottom-6 left-0 right-0 px-4 z-10">
            {reactSent ? (
              <div className="flex justify-center">
                <div className="bg-black/60 rounded-full px-5 py-3 text-4xl backdrop-blur-sm animate-bounce">
                  {reactSent}
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    className="text-2xl hover:scale-125 transition-transform active:scale-90 drop-shadow-lg"
                    onMouseDown={e => e.stopPropagation()}
                    onMouseUp={e => { e.stopPropagation(); handleReact(emoji); }}
                    onTouchStart={e => e.stopPropagation()}
                    onTouchEnd={e => { e.stopPropagation(); handleReact(emoji); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
