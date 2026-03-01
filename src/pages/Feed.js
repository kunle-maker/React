import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlusSquare, FiHome, FiUsers } from 'react-icons/fi';
import { useInView } from 'react-intersection-observer';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import PostSkeleton from '../components/PostSkeleton';
import API from '../utils/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('forYou');
  const [page, setPage] = useState(1);
  
  const navigate = useNavigate();
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  });

  // Add a ref to track initial load
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    // Don't show cached posts - fetch fresh data immediately
    fetchPosts();

    const handleOpenCreatePost = () => {
      setShowCreatePost(true);
    };
    window.addEventListener('openCreatePostModal', handleOpenCreatePost);

    return () => {
      window.removeEventListener('openCreatePostModal', handleOpenCreatePost);
    };
  }, []); // Empty dependency array for initial load

  // Fetch posts when tab changes
  useEffect(() => {
    // Skip the initial render
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    
    // Reset and fetch for tab change
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts();
  }, [activeTab]);

  // Load more when scroll reaches bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      setPage(prev => prev + 1);
    }
  }, [inView, hasMore, isLoading, isLoadingMore]);

  // Fetch more posts when page changes
  useEffect(() => {
    if (page > 1) {
      fetchPosts(true);
    }
  }, [page]);

  const fetchPosts = async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      let data;
      
      console.log(`Fetching posts for tab: ${activeTab}, page: ${page}`); // Debug log
      
      if (activeTab === 'following') {
        data = await API.getFollowingFeed(page, 10);
      } else {
        data = await API.getPosts(page, 10);
      }

      console.log('Received data:', data); // Debug log

      let postsArray = [];
      
      if (Array.isArray(data)) {
        postsArray = data;
      } else if (data && Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else if (data && data.data && Array.isArray(data.data)) {
        postsArray = data.data;
      } else if (data && typeof data === 'object') {
        const arrays = Object.values(data).filter(Array.isArray);
        if (arrays.length > 0) {
          postsArray = arrays[0];
        }
      }
      
      console.log('Processed posts array:', postsArray); // Debug log
      
      if (isLoadMore) {
        setPosts(prev => {
          const newPosts = [...prev, ...postsArray];
          return newPosts;
        });
      } else {
        setPosts(postsArray);
      }
      
      // Check if there are more posts to load
      setHasMore(data?.hasMore || data?.has_more || postsArray.length === 10);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // ... rest of your component remains the same (handlers, render, etc.)
  
  // Show skeletons while loading initial posts
  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page">
        <Navbar user={currentUser} />
        <main className="main-content">
          <div className="feed-layout">
            <div className="posts-container">
              {[1, 2, 3].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
            <Sidebar currentUser={currentUser} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <Navbar user={currentUser} />
      
      <main className="main-content">
        <div className="feed-layout">
          <div className="posts-container">
            {/* Feed Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '24px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              padding: '0 16px'
            }}>
              <button
                onClick={() => {
                  setActiveTab('forYou');
                  // Force immediate fetch when clicking tab
                  setPosts([]);
                  setPage(1);
                  fetchPosts();
                }}
                style={{
                  flex: 1,
                  padding: '16px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'forYou' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'forYou' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'forYou' ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <FiHome size={18} />
                For You
              </button>
              <button
                onClick={() => {
                  setActiveTab('following');
                  // Force immediate fetch when clicking tab
                  setPosts([]);
                  setPage(1);
                  fetchPosts();
                }}
                style={{
                  flex: 1,
                  padding: '16px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'following' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === 'following' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'following' ? '600' : '400',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <FiUsers size={18} />
                Following
              </button>
            </div>

            {/* Feed Content */}
            {posts.length === 0 && !isLoading ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeTab === 'following' ? '👥' : '📷'}
                </div>
                <h2 className="empty-title">
                  {activeTab === 'following' ? 'No posts from people you follow' : 'No posts yet'}
                </h2>
                <p className="empty-text">
                  {activeTab === 'following' 
                    ? 'Follow more people to see their posts here' 
                    : 'Be the first to share something!'}
                </p>
                {activeTab === 'following' ? (
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/search')}
                  >
                    Discover People
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreatePost(true)}
                  >
                    Create your first post
                  </button>
                )}
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onComment={handleComment}
                    onBookmark={handleBookmark}
                    onDelete={handleDeletePost}
                    onPostClick={() => handlePostClick(post)}
                    onDoubleTapLike={(postId) => {
                      const post = posts.find(p => p._id === postId);
                      const isLiked = post?.likes?.includes(currentUser?._id) || 
                                     post?.likes?.includes(currentUser?.id);
                      if (!isLiked) {
                        handleLike(postId);
                      }
                    }}
                  />
                ))}
                
                {/* Loading indicator and intersection observer target */}
                {isLoadingMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div className="loading-spinner"></div>
                  </div>
                )}
                
                {hasMore && (
                  <div ref={ref} style={{ height: '20px', margin: '20px 0' }} />
                )}
                
                {!hasMore && posts.length > 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: 'var(--text-dim)',
                    fontSize: '14px'
                  }}>
                    No more posts to load
                  </div>
                )}
              </>
            )}
          </div>
          
          <Sidebar currentUser={currentUser} />
        </div>
      </main>

      {currentUser && (
        <button 
          className="floating-create-btn"
          onClick={() => setShowCreatePost(true)}
          title="Create Post"
        >
          <FiPlusSquare size={24} />
        </button>
      )}

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onSubmit={handleCreatePostSubmit}
        />
      )}
    </div>
  );
};

export default Feed;