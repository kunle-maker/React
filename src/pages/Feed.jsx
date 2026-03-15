import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUsers, FiRefreshCw, FiBookmark, FiGlobe } from 'react-icons/fi';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import API from '../utils/api';

const TABS = [
  { id: 'explore', label: 'Explore', icon: FiGlobe },
  { id: 'following', label: 'Following', icon: FiUsers },
  { id: 'bookmarks', label: 'Saved', icon: FiBookmark },
];

export default function Feed({ currentUser, unreadCounts }) {
  const [tab, setTab] = useState('explore');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loader = useRef(null);

  const fetchPosts = useCallback(async (pg = 1, resetPosts = false) => {
    try {
      setLoading(pg === 1);
      let result;
      if (tab === 'following') {
        result = await API.getFollowingFeed(pg, 10);
      } else if (tab === 'explore') {
        result = await API.getPosts(pg, 20);
      } else if (tab === 'bookmarks') {
        result = await API.getBookmarks(pg, 20);
      }

      const newPosts = result?.posts || (Array.isArray(result) ? result : []);
      setPosts(prev => resetPosts ? newPosts : [...prev, ...newPosts]);
      setHasMore(result?.hasMore || false);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [tab]);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  }, [tab]);

  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page);
  }, [page]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.5 });
    if (loader.current) obs.observe(loader.current);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPosts([]);
    setPage(1);
    fetchPosts(1, true);
  };

  const handlePostCreated = (post) => {
    setPosts(prev => [post, ...prev]);
  };

  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold text-discord-text">Home</h1>
            <button
              className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors"
              onClick={handleRefresh}
            >
              <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-discord-hover">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === t.id ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text hover:bg-discord-hover'}`}
                onClick={() => setTab(t.id)}
              >
                <t.icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Create Post */}
        {tab !== 'bookmarks' && (
          <CreatePost currentUser={currentUser} onPost={handlePostCreated} />
        )}

        {tab === 'explore' && (
          <div className="px-4 py-2 border-b border-discord-hover">
            <p className="text-discord-muted text-xs">All posts from everyone on VesselX</p>
          </div>
        )}

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-discord-hover animate-pulse">
                <div className="flex gap-3">
                  <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-48 w-full rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-discord-muted">
            <div className="text-4xl mb-3">
              {tab === 'following' ? '👥' : tab === 'bookmarks' ? '🔖' : '🌐'}
            </div>
            <p className="font-semibold text-discord-text mb-1">
              {tab === 'following' ? "Follow people to see their posts" : tab === 'bookmarks' ? "No saved posts yet" : "No posts yet"}
            </p>
            <p className="text-sm">
              {tab === 'following' ? "Explore and follow users to fill your feed" : tab === 'bookmarks' ? "Start exploring and saving posts you love" : "Be the first to post something!"}
            </p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                onDelete={handlePostDelete}
              />
            ))}
            {hasMore && <div ref={loader} className="py-4 text-center text-discord-muted text-sm">Loading more...</div>}
            {!hasMore && posts.length > 0 && (
              <div className="py-8 text-center text-discord-muted text-sm">You're all caught up! 🎉</div>
            )}
          </>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
