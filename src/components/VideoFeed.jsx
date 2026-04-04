import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBookmark, FiVolume2, FiVolumeX, FiRepeat, FiSend, FiMoreVertical, FiShare2 } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { VerifiedBadge } from './UserBadge';
import API from '../utils/api';

function twemojiUrl(emoji) {
  const cps = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://twemoji.maxcdn.com/v/latest/svg/${cps.join('-')}.svg`;
}
function TwemojiImg({ emoji, size = 24, className = '' }) {
  return <img src={twemojiUrl(emoji)} alt={emoji} width={size} height={size} draggable={false} className={`select-none object-contain inline-block ${className}`} loading="lazy" />;
}

function formatCount(n) {
  if (!n || n === 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
  return String(n);
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function VideoCard({ post, isActive, onLike, onBookmark }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [flashType, setFlashType] = useState('play'); // play, pause, like
  const [expanded, setExpanded] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const flashTimer = useRef(null);

  const video = post.media?.find(m => m.type === 'video');
  const author = typeof post.userId === 'object' && post.userId !== null
    ? post.userId
    : { username: post.username || String(post.userId || 'user'), profilePicture: post.profilePicture };

  const likeCount = post._likeCount ?? (Array.isArray(post.likes) ? post.likes.length : 0);
  const commentCount = post._commentCount ?? (Array.isArray(post.comments) ? post.comments.length : 0);
  const caption = post.caption || '';
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
  const isLong = caption.length > 80;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
      el.onplay = () => setPlaying(true);
      el.onpause = () => setPlaying(false);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const handleTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap - Like
      if (!post._liked) onLike(post._id);
      triggerFlash('like');
      setLastTap(0);
    } else {
      setLastTap(now);
      // Single tap - Play/Pause
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) { 
        el.play().catch(() => {});
        triggerFlash('play');
      } else { 
        el.pause();
        triggerFlash('pause');
      }
    }
  };

  const triggerFlash = (type) => {
    setFlashType(type);
    setShowFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setShowFlash(false), 800);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  if (!video) return null;

  const likeStr = formatCount(likeCount);
  const commentStr = formatCount(commentCount);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      <video
        ref={videoRef}
        src={video.url}
        className="absolute inset-0 w-full h-full object-cover"
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (el && el.duration) setProgress(el.currentTime / el.duration);
        }}
        onClick={handleTap}
      />

      {/* Overlays */}
      <div className="absolute inset-0 pointer-events-none" 
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 25%, transparent 50%, rgba(0,0,0,0.2) 100%)' }} 
      />

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-40">
        <div className="h-full bg-discord-brand shadow-[0_0_8px_rgba(88,101,242,0.6)] transition-all duration-100 ease-linear" 
             style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Flash Animations */}
      {showFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-ping-once">
            {flashType === 'like' ? (
              <TwemojiImg emoji="❤️" size={100} className="drop-shadow-[0_0_30px_rgba(255,0,0,0.5)]" />
            ) : flashType === 'play' ? (
              <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <TwemojiImg emoji="▶️" size={40} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                <TwemojiImg emoji="⏸️" size={40} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Actions */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-1 group">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
            className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg active:scale-90 transition-transform mb-2"
          >
            {author.profilePicture 
              ? <img src={author.profilePicture} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full bg-discord-brand flex items-center justify-center text-white font-bold">
                  {author.username[0].toUpperCase()}
                </div>
            }
          </button>
          <div className="absolute -bottom-1 bg-discord-brand text-white rounded-full p-0.5 border-2 border-black">
             <FiPlus size={10} />
          </div>
        </div>

        <button
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          onClick={(e) => { e.stopPropagation(); onLike(post._id); }}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
            {post._liked
              ? <TwemojiImg emoji="❤️" size={28} />
              : <FiHeart size={26} className="text-white" strokeWidth={2} />
            }
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{likeStr || '0'}</span>
        </button>

        <button
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          onClick={(e) => { e.stopPropagation(); navigate(`/post/${post._id}`, { state: { post } }); }}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
             <FiMessageCircle size={26} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{commentStr || '0'}</span>
        </button>

        <button
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          onClick={(e) => { e.stopPropagation(); onBookmark(post._id); }}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
             <FiBookmark size={24} className={post._bookmarked ? 'text-yellow-400' : 'text-white'} fill={post._bookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">Save</span>
        </button>

        <button
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          onClick={(e) => { e.stopPropagation(); /* share logic */ }}
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
             <FiShare2 size={24} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
        </button>

        <button
          onClick={toggleMute}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-90 transition-transform mt-2"
        >
          {muted ? <FiVolumeX size={18} className="text-white" /> : <FiVolume2 size={18} className="text-white" />}
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-4 left-0 right-16 z-30 px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            className="text-white font-bold text-base flex items-center gap-1.5 drop-shadow-md"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
          >
            @{author.username}
            {author.isVerified && <VerifiedBadge size={15} />}
          </button>
          <span className="text-white/40 text-xs font-bold">•</span>
          <span className="text-white/60 text-xs font-bold drop-shadow-md">{timeAgo(post.createdAt)}</span>
        </div>

        <div className="relative group">
          <div className={`text-white text-[14px] leading-[1.4] transition-all ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
            {caption}
            {hashtags.length > 0 && (
              <span className="ml-1">
                {hashtags.map(tag => (
                  <span key={tag} className="text-discord-brand font-semibold mr-1.5 drop-shadow-sm">#{tag}</span>
                ))}
              </span>
            )}
          </div>
          {isLong && (
            <button
              className="text-white/60 text-xs font-black uppercase tracking-wider mt-1.5"
              onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
            >
              {expanded ? 'Show Less' : '... Read More'}
            </button>
          )}
        </div>

        {/* Music Info (Branding) */}
        <div className="flex items-center gap-2 mt-4 text-white/80 overflow-hidden max-w-[80%]">
          <div className="animate-spin-slow">
             <TwemojiImg emoji="🎵" size={14} />
          </div>
          <div className="text-xs font-medium whitespace-nowrap animate-marquee">
             VesselX Original Sound - {author.username}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoFeed({ currentUser, initialPosts = [], startIndex = 0, onClose }) {
  const [videoPosts, setVideoPosts] = useState(initialPosts.length > 0 ? initialPosts : []);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 0);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const cardRefs = useRef([]);
  const observerRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchVideos = useCallback(async (pg = 1, reset = false) => {
    if (fetchingRef.current || initialPosts.length > 0) return;
    fetchingRef.current = true;
    try {
      if (pg === 1) setLoading(true);
      const result = await API.getPosts(pg, 20);
      const all = result?.posts ?? (Array.isArray(result) ? result : []);
      const videos = all.filter(p => p.media?.some(m => m.type === 'video'));
      const myId = currentUser?._id || currentUser?.id;
      const enriched = videos.map(p => ({
        ...p,
        _liked: p.isLiked ?? (myId && Array.isArray(p.likes) ? p.likes.some(l => (l._id ?? l) === myId) : false),
        _bookmarked: p.isBookmarked ?? false,
        _likeCount: p.likeCount ?? (Array.isArray(p.likes) ? p.likes.length : 0),
        _commentCount: p.commentCount ?? (Array.isArray(p.comments) ? p.comments.length : 0),
      }));
      setVideoPosts(prev => reset ? enriched : [...prev, ...enriched]);
      setHasMore(result?.hasMore ?? false);
    } catch { }
    finally { setLoading(false); fetchingRef.current = false; }
  }, [currentUser, initialPosts]);

  const currentUserId = currentUser?._id || currentUser?.id;
  useEffect(() => { 
    if (initialPosts.length === 0) fetchVideos(1, true); 
    else {
      // Scroll to start index
      const el = cardRefs.current[startIndex];
      if (el) el.scrollIntoView({ behavior: 'auto' });
    }
  }, [currentUserId, initialPosts, startIndex]);

  useEffect(() => { if (page > 1 && initialPosts.length === 0) fetchVideos(page); }, [page, initialPosts]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.intersectionRatio >= 0.5) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);
            if (hasMore && idx >= videoPosts.length - 2 && initialPosts.length === 0) setPage(p => p + 1);
          }
        });
      },
      { threshold: [0.2, 0.5] }
    );
    cardRefs.current.forEach(el => { if (el) observerRef.current.observe(el); });
    return () => observerRef.current?.disconnect();
  }, [videoPosts, hasMore, initialPosts]);

  const handleLike = async (postId) => {
    setVideoPosts(prev => prev.map(p => p._id !== postId ? p : {
      ...p, _liked: !p._liked, _likeCount: p._liked ? p._likeCount - 1 : p._likeCount + 1
    }));
    try { await API.likePost(postId); } catch { }
  };

  const handleBookmark = async (postId) => {
    setVideoPosts(prev => prev.map(p => p._id === postId ? { ...p, _bookmarked: !p._bookmarked } : p));
    try { await API.bookmarkPost(postId); } catch { }
  };

  if (loading && videoPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 z-50 text-white/70 hover:text-white">
            <FiArrowLeft size={24} />
          </button>
        )}
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 border-4 border-discord-brand/20 rounded-full" />
           <div className="absolute inset-0 border-4 border-discord-brand border-t-transparent rounded-full animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <TwemojiImg emoji="🎬" size={24} className="animate-pulse" />
           </div>
        </div>
        <span className="text-white/40 text-xs font-bold uppercase tracking-widest mt-6">Loading Experience</span>
      </div>
    );
  }

  if (!loading && videoPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black px-12 text-center">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 z-50 text-white/70 hover:text-white">
            <FiArrowLeft size={24} />
          </button>
        )}
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
           <TwemojiImg emoji="📭" size={48} />
        </div>
        <p className="text-white font-bold text-lg mb-2">No videos discovered</p>
        <p className="text-white/40 text-sm leading-relaxed">Be the first to spark a connection by sharing a reel!</p>
        <button 
          onClick={() => initialPosts.length === 0 ? window.location.reload() : onClose?.()}
          className="mt-8 px-8 py-3 rounded-full bg-discord-brand text-white font-bold text-sm shadow-xl shadow-discord-brand/20 active:scale-95 transition-transform"
        >
          {initialPosts.length === 0 ? 'Refresh Feed' : 'Go Back'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar relative"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {onClose && (
        <button 
          onClick={onClose} 
          className="absolute top-6 left-6 z-50 text-white/80 hover:text-white drop-shadow-lg active:scale-90 transition-transform"
        >
          <FiArrowLeft size={28} />
        </button>
      )}

      {videoPosts.map((post, idx) => (
        <div
          key={post._id || idx}
          ref={el => { cardRefs.current[idx] = el; }}
          data-index={idx}
          className="snap-start snap-always w-full"
          style={{ height: '100%' }}
        >
          <VideoCard
            post={post}
            isActive={idx === activeIndex}
            onLike={handleLike}
            onBookmark={handleBookmark}
          />
        </div>
      ))}
      {hasMore && initialPosts.length === 0 && (
        <div className="snap-start flex items-center justify-center bg-black" style={{ height: '100%' }}>
          <div className="w-8 h-8 border-4 border-white/10 border-t-discord-brand rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}


export default function VideoFeed({ currentUser }) {
  const [videoPosts, setVideoPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef([]);
  const observerRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchVideos = useCallback(async (pg = 1, reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (pg === 1) setLoading(true);
      const result = await API.getPosts(pg, 20);
      const all = result?.posts ?? (Array.isArray(result) ? result : []);
      const videos = all.filter(p => p.media?.some(m => m.type === 'video'));
      const myId = currentUser?._id || currentUser?.id;
      const enriched = videos.map(p => ({
        ...p,
        _liked: p.isLiked ?? (myId && Array.isArray(p.likes) ? p.likes.some(l => (l._id ?? l) === myId) : false),
        _bookmarked: p.isBookmarked ?? false,
        _likeCount: p.likeCount ?? (Array.isArray(p.likes) ? p.likes.length : 0),
        _commentCount: p.commentCount ?? (Array.isArray(p.comments) ? p.comments.length : 0),
      }));
      setVideoPosts(prev => reset ? enriched : [...prev, ...enriched]);
      setHasMore(result?.hasMore ?? false);
    } catch { }
    finally { setLoading(false); fetchingRef.current = false; }
  }, [currentUser]);

  const currentUserId = currentUser?._id || currentUser?.id;
  useEffect(() => { fetchVideos(1, true); }, [currentUserId]);
  useEffect(() => { if (page > 1) fetchVideos(page); }, [page]);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.intersectionRatio >= 0.5) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);
            if (hasMore && idx >= videoPosts.length - 2) setPage(p => p + 1);
          }
        });
      },
      { threshold: [0.2, 0.5] }
    );
    cardRefs.current.forEach(el => { if (el) observerRef.current.observe(el); });
    return () => observerRef.current?.disconnect();
  }, [videoPosts, hasMore]);

  const handleLike = async (postId) => {
    setVideoPosts(prev => prev.map(p => p._id !== postId ? p : {
      ...p, _liked: !p._liked, _likeCount: p._liked ? p._likeCount - 1 : p._likeCount + 1
    }));
    try { await API.likePost(postId); } catch { }
  };

  const handleBookmark = async (postId) => {
    setVideoPosts(prev => prev.map(p => p._id === postId ? { ...p, _bookmarked: !p._bookmarked } : p));
    try { await API.bookmarkPost(postId); } catch { }
  };

  if (loading && videoPosts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <span className="text-white/40 text-sm">Loading reels...</span>
        </div>
      </div>
    );
  }

  if (!loading && videoPosts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center px-6">
          <svg viewBox="0 0 48 48" className="w-14 h-14 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="40" height="40" rx="8" />
            <polygon points="19,16 35,24 19,32" fill="currentColor" strokeWidth="0" />
          </svg>
          <p className="font-semibold text-white/70 text-base mb-1">No videos yet</p>
          <p className="text-white/35 text-sm">Be the first to post a video!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {videoPosts.map((post, idx) => (
        <div
          key={post._id || idx}
          ref={el => { cardRefs.current[idx] = el; }}
          data-index={idx}
          className="snap-start snap-always w-full"
          style={{ height: '100%' }}
        >
          <VideoCard
            post={post}
            isActive={idx === activeIndex}
            onLike={handleLike}
            onBookmark={handleBookmark}
          />
        </div>
      ))}
      {hasMore && (
        <div className="snap-start flex items-center justify-center bg-black" style={{ height: 60 }}>
          <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
