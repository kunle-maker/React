import React, { useState, useEffect, useRef } from 'react';
import { FiFilm, FiHeart, FiMessageCircle, FiShare2, FiVolume2, FiVolumeX } from 'react-icons/fi';
import Layout from '../components/Layout';
import API from '../utils/api';

function ReelItem({ post, isActive }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);

  const videoMatch = (post.content || '').match(/\[vx:video:([^\]]+)\]/);
  const videoUrl = videoMatch ? videoMatch[1] : null;
  const caption = (post.content || '').replace(/\[vx:[^\]]+\]\n?/g, '').trim();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [isActive]);

  if (!videoUrl) return null;

  return (
    <div className="relative w-full flex-shrink-0 snap-start" style={{ height: 'calc(100svh - 120px)' }}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted(m => !m)}
      />
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />

      <div className="absolute bottom-4 left-4 right-16 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-discord-brand flex items-center justify-center text-white text-xs font-bold overflow-hidden">
            {post.userId?.profilePicture
              ? <img src={post.userId.profilePicture} alt="" className="w-full h-full object-cover" />
              : (post.userId?.username?.[0] || 'V').toUpperCase()}
          </div>
          <span className="text-white text-sm font-semibold">@{post.userId?.username || 'user'}</span>
        </div>
        {caption && <p className="text-white text-sm leading-relaxed line-clamp-3">{caption}</p>}
      </div>

      <div className="absolute right-3 bottom-4 flex flex-col gap-4 z-10">
        <button
          className="flex flex-col items-center gap-1"
          onClick={() => setLiked(l => !l)}
        >
          <FiHeart size={24} className={liked ? 'text-red-400 fill-current' : 'text-white'} />
          <span className="text-white text-xs">{(post.likesCount || 0) + (liked ? 1 : 0)}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <FiMessageCircle size={24} className="text-white" />
          <span className="text-white text-xs">{post.commentsCount || 0}</span>
        </button>
        <button onClick={() => setMuted(m => !m)}>
          {muted ? <FiVolumeX size={24} className="text-white" /> : <FiVolume2 size={24} className="text-white" />}
        </button>
      </div>
    </div>
  );
}

export default function Reels({ currentUser, unreadCounts }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await API.getFeed(1, 50);
        const feed = data?.posts || data || [];
        const videoPosts = feed.filter(p => (p.content || '').includes('[vx:video:'));
        setPosts(videoPosts);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      setActiveIdx(idx);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-full bg-discord-brand/10 flex items-center justify-center">
            <FiFilm size={36} className="text-discord-brand" />
          </div>
          <div>
            <h2 className="text-discord-text font-bold text-xl mb-1">No Reels Yet</h2>
            <p className="text-discord-muted text-sm">Be the first to share a video reel!</p>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory px-3 py-2 flex flex-col gap-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {posts.map((post, i) => (
            <ReelItem key={post._id || i} post={post} isActive={i === activeIdx} />
          ))}
        </div>
      )}
    </Layout>
  );
}
