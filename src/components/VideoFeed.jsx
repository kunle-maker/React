import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBookmark, FiVolume2, FiVolumeX, FiShare2, FiPlay } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import Avatar from './Avatar';
import { AnimatedBadge, VerifiedBadge, SupaBadge } from './UserBadge';
import { getBadgeById } from '../data/badges';
import API from '../utils/api';
import { activeVideo, playVideo, pauseVideo } from '../utils/videoPlayer';
import { parseEmojisToHtml } from '../utils/emoji';

function VideoCard({ post, currentUser, isActive, onLike, onBookmark }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const playIconTimer = useRef(null);

  const video = post.media?.find(m => m.type === 'video');
  const author = post.userId || { username: post.username };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      playVideo(el);
      el.onplay = () => setPlaying(true);
      el.onpause = () => setPlaying(false);
    } else {
      pauseVideo(el);
      setPlaying(false);
    }
  }, [isActive]);

  const handleTap = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      playVideo(el);
    } else {
      pauseVideo(el);
    }
    setShowPlayIcon(true);
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 700);
  };

  const handleTimeUpdate = () => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    setProgress(el.currentTime / el.duration);
  };

  const handleSeek = (e) => {
    const el = videoRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  if (!video) return null;

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none">
      {/* Video */}
      <video
        ref={videoRef}
        src={API.getMediaUrl(video.url)}
        className="absolute inset-0 w-full h-full object-contain"
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 pointer-events-none" />

      {/* Tap area */}
      <div className="absolute inset-0 z-10" onClick={handleTap} />

      {/* Progress bar (top) */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 bg-white/15 z-30 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
      >
        <div className="h-full bg-white/80 rounded-full" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Play/Pause flash */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-opacity duration-200 ${showPlayIcon ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          {playing
            ? <div className="flex gap-1"><div className="w-1.5 h-5 bg-white rounded-full"/><div className="w-1.5 h-5 bg-white rounded-full"/></div>
            : <FiPlay size={24} className="text-white ml-1" fill="white" />
          }
        </div>
      </div>

      {/* Top right: mute button */}
      <div className="absolute top-10 right-3 z-30">
        <button
          onClick={toggleMute}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
        </button>
      </div>

      {/* Right side action buttons */}
      <div className="absolute right-2 z-30 flex flex-col items-center gap-4" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}>
        {/* Avatar */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
          className="flex flex-col items-center"
        >
          <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
            <Avatar user={author} size={40} />
          </div>
        </button>

        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(post._id); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            {post._liked ? <HiHeart size={22} className="text-red-400" /> : <FiHeart size={20} className="text-white" />}
          </div>
          {post._likeCount > 0 && (
            <span className="text-white text-[11px] font-bold drop-shadow">{post._likeCount > 999 ? `${Math.floor(post._likeCount/1000)}k` : post._likeCount}</span>
          )}
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/post/${post._id}`, { state: { post } }); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <FiMessageCircle size={20} className="text-white" />
          </div>
          {post.commentCount > 0 && (
            <span className="text-white text-[11px] font-bold drop-shadow">{post.commentCount}</span>
          )}
        </button>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(post._id); }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <FiBookmark size={18} className="text-white" fill={post._bookmarked ? 'white' : 'none'} />
          </div>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(window.location.origin + `/#/post/${post._id}`);
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <FiShare2 size={18} className="text-white" />
          </div>
        </button>
      </div>

      {/* Bottom overlay: user info + caption */}
      <div
        className="absolute left-0 z-30 px-3 pr-14"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)', maxWidth: '78%' }}
      >
        <button
          className="flex items-center gap-1.5 mb-1"
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
        >
          <span className="font-bold text-white text-sm drop-shadow-sm leading-tight">
            @{author.username || post.username}
          </span>
          {author.isVerified && <VerifiedBadge size={14} />}
          {author.isSupa && <SupaBadge size={14} username={author.username || post.username} />}
          {author.badge && getBadgeById(author.badge) && (
            <AnimatedBadge badgeId={author.badge} size="0.9em" />
          )}
        </button>

        {post.caption && (
          <p className="text-white/90 text-xs leading-snug drop-shadow-sm post-content" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
            dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(post.caption) }}
          />
        )}

        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 mt-1">
            {post.hashtags.slice(0, 3).map(tag => (
              <span key={tag} className="text-white/70 text-[11px] font-semibold drop-shadow-sm">#{tag}</span>
            ))}
          </div>
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
      const all = result?.posts || (Array.isArray(result) ? result : []);
      const videos = all.filter(p => p.media?.some(m => m.type === 'video'));

      const myId = currentUser?._id || currentUser?.id;
      const enriched = videos.map(p => ({
        ...p,
        _liked: p.isLiked !== undefined ? p.isLiked : (myId && p.likes ? p.likes.some(l => l === myId || l._id === myId) : false),
        _bookmarked: p.isBookmarked || false,
        _likeCount: p.likeCount ?? p.likes?.length ?? 0,
      }));

      setVideoPosts(prev => reset ? enriched : [...prev, ...enriched]);
      setHasMore(result?.hasMore || false);
    } catch { }
    finally { setLoading(false); fetchingRef.current = false; }
  }, [currentUser]);

  const currentUserId = currentUser?._id || currentUser?.id;

  useEffect(() => { fetchVideos(1, true); }, [currentUserId]);

  useEffect(() => {
    if (page === 1) return;
    fetchVideos(page);
  }, [page]);

  // IntersectionObserver: autoplay at ≥50%, pause at <20%
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const idx = parseInt(entry.target.dataset.index, 10);
          if (entry.intersectionRatio >= 0.5) {
            setActiveIndex(idx);
            if (hasMore && idx >= videoPosts.length - 2) {
              setPage(p => p + 1);
            }
          }
        });
      },
      { threshold: [0.2, 0.5] }
    );
    cardRefs.current.forEach(el => { if (el) observerRef.current.observe(el); });
    return () => observerRef.current?.disconnect();
  }, [videoPosts, hasMore]);

  const handleLike = async (postId) => {
    setVideoPosts(prev => prev.map(p => {
      if (p._id !== postId) return p;
      return { ...p, _liked: !p._liked, _likeCount: p._liked ? p._likeCount - 1 : p._likeCount + 1 };
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
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading reels...</span>
        </div>
      </div>
    );
  }

  if (!loading && videoPosts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <div className="text-5xl mb-4">🎬</div>
          <p className="font-semibold text-white mb-1">No videos yet</p>
          <p className="text-white/50 text-sm">Be the first to post a video!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-scroll snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none' }}
    >
      {videoPosts.map((post, idx) => (
        <div
          key={post._id}
          ref={el => { cardRefs.current[idx] = el; }}
          data-index={idx}
          className="snap-start snap-always w-full"
          style={{ height: '100%' }}
        >
          <VideoCard
            post={post}
            currentUser={currentUser}
            isActive={idx === activeIndex}
            onLike={handleLike}
            onBookmark={handleBookmark}
          />
        </div>
      ))}
      {hasMore && (
        <div className="snap-start flex items-center justify-center bg-black" style={{ height: 60 }}>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
