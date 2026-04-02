import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBookmark, FiVolume2, FiVolumeX, FiRepeat, FiSend } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { VerifiedBadge } from './UserBadge';
import API from '../utils/api';

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
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const yrs = Math.floor(months / 12);
  return yrs === 1 ? '1 year ago' : `${yrs} years ago`;
}

function VideoCard({ post, isActive, onLike, onBookmark }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const flashTimer = useRef(null);

  const video = post.media?.find(m => m.type === 'video');
  const author = typeof post.userId === 'object' && post.userId !== null
    ? post.userId
    : { username: post.username || String(post.userId || 'user') };

  const likeCount = post._likeCount ?? (Array.isArray(post.likes) ? post.likes.length : 0);
  const commentCount = post._commentCount ?? (Array.isArray(post.comments) ? post.comments.length : 0);
  const caption = post.caption || '';
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
  const isLong = caption.length > 90;

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

  const handleTap = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); }
    else { el.pause(); }
    setShowFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setShowFlash(false), 650);
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
    <div
      className="relative w-full h-full bg-black overflow-hidden select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
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

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 30%, transparent 55%, rgba(0,0,0,0.15) 100%)' }}
      />

      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/20 z-30">
        <div className="h-full bg-white/80" style={{ width: `${progress * 100}%`, transition: 'none' }} />
      </div>

      {showFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
            {playing
              ? <div className="flex gap-[5px]"><div className="w-[5px] h-6 bg-white rounded-full" /><div className="w-[5px] h-6 bg-white rounded-full" /></div>
              : <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
            }
          </div>
        </div>
      )}

      <div className="absolute z-30" style={{ bottom: '28%', right: 14 }}>
        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded-full bg-black/55 flex items-center justify-center"
        >
          {muted
            ? <FiVolumeX size={15} className="text-white" />
            : <FiVolume2 size={15} className="text-white" />
          }
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30 px-3.5 pb-5">
        <div className="flex items-center gap-5 mb-3">
          <button
            className="flex items-center gap-[6px]"
            onClick={(e) => { e.stopPropagation(); onLike(post._id); }}
          >
            {post._liked
              ? <HiHeart size={27} className="text-red-500" />
              : <FiHeart size={25} className="text-white" strokeWidth={1.8} />
            }
            {likeStr && <span className="text-white text-[13px] font-semibold tracking-tight">{likeStr}</span>}
          </button>

          <button
            className="flex items-center gap-[6px]"
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post._id}`, { state: { post } }); }}
          >
            <FiMessageCircle size={25} className="text-white" strokeWidth={1.8} />
            {commentStr && <span className="text-white text-[13px] font-semibold tracking-tight">{commentStr}</span>}
          </button>

          <button className="flex items-center gap-[6px]" onClick={(e) => e.stopPropagation()}>
            <FiRepeat size={23} className="text-white" strokeWidth={1.8} />
          </button>

          <button className="flex items-center gap-[6px]" onClick={(e) => e.stopPropagation()}>
            <FiSend size={22} className="text-white" strokeWidth={1.8} />
          </button>

          <button
            className="flex items-center gap-[6px] ml-auto"
            onClick={(e) => { e.stopPropagation(); onBookmark(post._id); }}
          >
            <FiBookmark size={23} className="text-white" strokeWidth={1.8} fill={post._bookmarked ? 'white' : 'none'} />
          </button>
        </div>

        <div className="leading-snug">
          <span>
            <button
              className="text-white font-bold text-[13.5px] mr-1"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
            >
              {author.username}
              {author.isVerified && <span className="ml-1"><VerifiedBadge size={13} /></span>}
            </button>
            {caption && (
              <span className="text-white text-[13px] leading-snug">
                {expanded || !isLong ? caption : `${caption.slice(0, 90).trimEnd()}... `}
                {isLong && (
                  <button
                    className="text-white/55 text-[13px] font-medium"
                    onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
                  >
                    {expanded ? ' less' : 'more'}
                  </button>
                )}
              </span>
            )}
          </span>
        </div>

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-x-1.5 mt-[3px]">
            {hashtags.map(tag => (
              <span key={tag} className="text-[#5bb3ff] text-[13px] font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {post.createdAt && (
          <p className="text-white/45 text-[12px] mt-[3px]">{timeAgo(post.createdAt)}</p>
        )}
      </div>
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
