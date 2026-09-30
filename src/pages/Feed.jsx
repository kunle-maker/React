import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiCheck } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import StoriesBar from '../components/StoriesBar';
import StoryViewer from '../components/StoryViewer';
import VideoFeed from '../components/VideoFeed';
import API from '../utils/api';

function TwemojiImg({ emoji, size = 40 }) {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
  return <img src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${cp}.png`} alt={emoji} width={size} height={size} draggable={false} className="select-none object-contain inline-block" />;
}

const TABS = [
  { id: 'foryou',    label: 'For You' },
  { id: 'following', label: 'Following' },
];

export default function Feed({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const T = {
    headerBg: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(13,15,20,0.95)',
    border:   isLight ? '#dbdbdb'                : 'rgba(255,255,255,0.06)',
    text:     isLight ? '#262626'                : '#e2e5ea',
    muted:    isLight ? '#8e8e8e'                : 'rgba(255,255,255,0.3)',
    btnBg:    isLight ? 'rgba(0,0,0,0.04)'       : 'rgba(255,255,255,0.05)',
  };
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [tab, setTab] = useState('foryou');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loader = useRef(null);

  const [storyGroups, setStoryGroups] = useState([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerGroupIdx, setStoryViewerGroupIdx] = useState(0);
  const storiesBarRef = useRef(null);

  const [usingFallback, setUsingFallback] = useState(false);

  const fetchPosts = useCallback(async (pg = 1, resetPosts = false) => {
    try {
      setLoading(pg === 1);
      let result;
      if (tab === 'foryou') {
        result = await API.getRecommendedFeed(pg, 15);
      } else {
        result = await API.getFollowingFeed(pg, 10);
        setUsingFallback(result?.usingFallback ?? false);
      }
      const newPosts = result?.posts || (Array.isArray(result) ? result : []);
      setPosts(prev => resetPosts ? newPosts : [...prev, ...newPosts]);
      setHasMore(result?.hasMore ?? (newPosts.length > 0));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setUsingFallback(false);
    fetchPosts(1, true);
  }, [tab]);

  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page);
  }, [page]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) setPage(p => p + 1);
    }, { threshold: 0.5 });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  const handleRefresh = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    setRefreshing(true);
    setPosts([]);
    setPage(1);
    fetchPosts(1, true);
  };

  const handleOpenViewer = (groups, idx) => {
    setStoryGroups(groups);
    setStoryViewerGroupIdx(idx);
    setStoryViewerOpen(true);
  };

  const handleMediaClick = (post, mediaIndex) => {
    const media = post.media?.[mediaIndex];
    if (media?.type === 'video') {
      // Find all videos in current posts to maintain context
      const videoOnlyPosts = posts.filter(p => p.media?.some(m => m.type === 'video'));
      const videoIdx = videoOnlyPosts.findIndex(p => p._id === post._id);
      
      // Navigate to /reels with state
      navigate('/reels', { 
        state: { 
          initialPosts: videoOnlyPosts, 
          startIndex: Math.max(0, videoIdx) 
        } 
      });
    } else {
      navigate(`/post/${post._id}`, { state: { post } });
    }
  };

  return (
    <Layout
      currentUser={currentUser}
      unreadCounts={unreadCounts}
      contentClass={`overflow-y-auto scrollable no-scrollbar mobile-content-pad page-enter ${isLight ? 'bg-[#fafafa]' : 'bg-discord-bg'}`}
    >
      {storyViewerOpen && (
        <StoryViewer
          groups={storyGroups}
          startGroupIndex={storyViewerGroupIdx}
          currentUser={currentUser}
          onClose={() => setStoryViewerOpen(false)}
          onReload={() => storiesBarRef.current?.reload?.()}
        />
      )}

      {/* Orbix-style Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          {/* Left: hamburger / menu */}
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: T.text }}
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <rect width="20" height="2.5" rx="1.25" fill="currentColor" />
              <rect y="5.75" width="14" height="2.5" rx="1.25" fill="currentColor" />
              <rect y="11.5" width="20" height="2.5" rx="1.25" fill="currentColor" />
            </svg>
          </button>

          {/* Center: Home title */}
          <h1 className="text-[17px] font-bold tracking-tight absolute left-1/2 -translate-x-1/2" style={{ color: T.text }}>
            Home
          </h1>

          {/* Right: bell with count + search */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ border: `1px solid ${T.border}`, color: T.text }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {(unreadCounts.notifications || 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-discord-red text-white text-[9px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5">
                  {unreadCounts.notifications > 9 ? '9+' : unreadCounts.notifications}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/search')}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ border: `1px solid ${T.border}`, color: T.text }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex max-w-2xl mx-auto" style={{ borderTop: `1px solid ${T.border}` }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 text-sm font-bold transition-all relative"
              style={{ color: tab === t.id ? T.text : T.muted }}
            >
              {t.label}
              {tab === t.id && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] rounded-full" style={{ background: T.text }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        <StoriesBar
          ref={storiesBarRef}
          currentUser={currentUser}
          onOpenViewer={handleOpenViewer}
        />

        <div className="px-4 py-2">
           <CreatePost currentUser={currentUser} onPost={p => setPosts(prev => [p, ...prev])} />
        </div>

        {usingFallback && tab === 'following' && (
          <div className="mx-4 my-3 px-4 py-3 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-xs text-brand-primary font-bold flex items-center gap-2">
            <TwemojiImg emoji="✨" size={16} />
            <span>Showing recommended posts since you're new here!</span>
          </div>
        )}

        <div className="divide-y divide-discord-hover/20">
          {loading && posts.length === 0 ? (
            <div className="divide-y divide-discord-hover/20">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse px-4 py-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-discord-hover flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-discord-hover rounded-full w-28" />
                      <div className="h-2.5 bg-discord-hover/60 rounded-full w-16" />
                    </div>
                    <div className="w-6 h-6 rounded-full bg-discord-hover/50" />
                  </div>
                  {i % 3 !== 2 && <div className="h-3 bg-discord-hover/70 rounded-full w-3/4" />}
                  <div className={`w-full bg-discord-hover rounded-3xl ${i % 2 === 0 ? 'h-72' : 'h-52'}`} />
                  {i % 3 === 0 && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="h-24 bg-discord-hover/60 rounded-xl" />
                      <div className="h-24 bg-discord-hover/60 rounded-xl" />
                      <div className="h-24 bg-discord-hover/60 rounded-xl" />
                    </div>
                  )}
                  <div className="flex items-center gap-6 pt-1">
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-discord-hover/60" /><div className="h-2.5 w-6 bg-discord-hover/60 rounded-full" /></div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-discord-hover/60" /><div className="h-2.5 w-6 bg-discord-hover/60 rounded-full" /></div>
                    <div className="w-5 h-5 rounded-full bg-discord-hover/60 ml-auto" />
                    <div className="w-5 h-5 rounded-full bg-discord-hover/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center px-10">
               <div className="mb-6 flex justify-center opacity-40 grayscale"><TwemojiImg emoji="🏜️" size={80} /></div>
               <h3 className="text-xl font-bold text-discord-text mb-2">The desert is quiet...</h3>
               <p className="text-discord-muted text-sm mb-8 leading-relaxed">Try following more people or check back later for fresh vibes.</p>
               <button onClick={() => navigate('/search')} className="bg-brand-primary text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-brand-primary/20 active:scale-95 transition-all">
                  Find Connections
               </button>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
                onClickMedia={handleMediaClick}
              />
            ))
          )}
        </div>

        {hasMore && (
           <div ref={loader} className="py-12 flex justify-center">
             <div className="w-8 h-8 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
           </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="py-16 text-center text-discord-muted/40 font-bold text-xs uppercase tracking-[0.2em] flex flex-col items-center gap-4">
            <div className="w-px h-12 bg-discord-hover/50" />
            <div className="relative w-10 h-10">
              <img src="/favicon.png" alt="VesselX" className="w-10 h-10 opacity-60" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                <FiCheck size={9} strokeWidth={3} className="text-white" />
              </div>
            </div>
            You've caught up with everyone
          </div>
        )}
        <div className="h-24" />
      </div>
    </Layout>
  );
}
