import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import StoriesBar from '../components/StoriesBar';
import StoryViewer from '../components/StoryViewer';
import API from '../utils/api';

function TwemojiImg({ emoji, size = 40 }) {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
  return <img src={`https://twemoji.maxcdn.com/v/latest/svg/${cp}.svg`} alt={emoji} width={size} height={size} draggable={false} className="select-none object-contain inline-block" />;
}

const TABS = [
  { id: 'foryou',    label: 'For You' },
  { id: 'following', label: 'Following' },
];

export default function Feed({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
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

  return (
    <Layout
      currentUser={currentUser}
      unreadCounts={unreadCounts}
      contentClass="overflow-y-auto scrollable mobile-content-pad page-enter"
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

      <div className="sticky top-0 z-10 bg-discord-bg/80 backdrop-blur-xl border-b border-discord-hover">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <h1 className="text-xl font-extrabold text-discord-text tracking-tight">VesselX</h1>
          <button
            aria-label="Refresh feed"
            className="p-2 rounded-full text-discord-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all active:scale-90"
            onClick={handleRefresh}
          >
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex max-w-2xl mx-auto relative px-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-[15px] font-bold transition-all relative ${
                tab === t.id
                  ? 'text-brand-primary'
                  : 'text-discord-muted hover:text-discord-text'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-brand-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                  style={{ width: '40%' }}
                />
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

        <CreatePost currentUser={currentUser} onPost={p => setPosts(prev => [p, ...prev])} />

        {usingFallback && tab === 'following' && (
          <div className="mx-4 my-2 px-4 py-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-xs text-discord-muted flex items-center gap-2">
            <span>👥</span>
            <span>Follow people to see their posts here. Showing popular posts for now.</span>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 border-b border-discord-hover/50">
                <div className="flex gap-3">
                  <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="skeleton h-3 w-24 rounded" />
                      <div className="skeleton h-3 w-16 rounded opacity-50" />
                    </div>
                    <div className="space-y-2">
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-[90%] rounded" />
                    </div>
                    <div className="skeleton h-56 w-full rounded-2xl" />
                    <div className="flex gap-6 pt-1">
                       <div className="skeleton h-4 w-12 rounded-full" />
                       <div className="skeleton h-4 w-12 rounded-full" />
                       <div className="skeleton h-4 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 px-6 animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 shadow-xl rotate-3">
                <TwemojiImg emoji={tab === 'following' ? '👥' : '✨'} size={48} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-discord-text mb-2">
              {tab === 'following' ? 'Your feed is empty' : 'Nothing here yet'}
            </h2>
            <p className="text-discord-muted mb-8 max-w-xs mx-auto">
              {tab === 'following' ? 'Follow your friends and creators to see what they are sharing.' : 'Check back later for fresh content from the community.'}
            </p>
            <button 
              onClick={() => navigate('/search')}
              className="discord-btn px-8 py-3 rounded-xl shadow-brand hover:scale-105 active:scale-95 transition-all"
            >
              Explore Community
            </button>
          </div>
        ) : (
          <div className="divide-y divide-discord-hover/30">
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                onDelete={id => setPosts(prev => prev.filter(p => p._id !== id))}
              />
            ))}
            {hasMore && <div ref={loader} className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
            </div>}
            {!hasMore && posts.length > 0 && (
              <div className="py-12 text-center text-discord-muted text-sm flex flex-col items-center gap-3">
                <TwemojiImg emoji="🎉" size={32} />
                <p className="font-medium">You've reached the end of the feed!</p>
              </div>
            )}
          </div>
        )}
        <div className="h-24 md:h-12" />
      </div>
    </Layout>
  );
}
