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

const CACHE_KEYS = {
  forYou: 'feed_forYou_cache',
  following: 'feed_following_cache'
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('forYou');
  const [page, setPage] = useState(1);
  const [lastFetchTime, setLastFetchTime] = useState({});
  
  const navigate = useNavigate();
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px'
  });

  // Load cached posts immediately on mount or tab change
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    // Load from cache first
    loadFromCache();
    
    // Then fetch fresh data
    refreshPosts();

    const handleOpenCreatePost = () => {
      setShowCreatePost(true);
    };
    window.addEventListener('openCreatePostModal', handleOpenCreatePost);

    return () => {
      window.removeEventListener('openCreatePostModal', handleOpenCreatePost);
    };
  }, []);

  // Handle tab changes
  useEffect(() => {
    // Reset pagination
    setPage(1);
    setHasMore(true);
    
    // Load cached posts for this tab
    loadFromCache();
    
    // Check if we need to refresh (cache older than 5 minutes)
    const lastFetch = lastFetchTime[activeTab] || 0;
    const now = Date.now();
    
    if (now - lastFetch > CACHE_DURATION) {
      refreshPosts();
    }
  }, [activeTab]);

  // Load more when scroll reaches bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore && !isRefreshing) {
      setPage(prev => prev + 1);
    }
  }, [inView, hasMore, isLoading, isLoadingMore, isRefreshing]);

  // Fetch more posts when page changes
  useEffect(() => {
    if (page > 1) {
      fetchMorePosts();
    }
  }, [page]);

  const loadFromCache = () => {
    try {
      const cacheKey = CACHE_KEYS[activeTab];
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        const { posts: cachedPosts, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Use cache if it's less than 5 minutes old
        if (now - timestamp < CACHE_DURATION) {
          setPosts(cachedPosts);
          setIsLoading(false);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  };

  const saveToCache = (postsToCache) => {
    try {
      const cacheKey = CACHE_KEYS[activeTab];
      sessionStorage.setItem(cacheKey, JSON.stringify({
        posts: postsToCache,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const refreshPosts = async () => {
    setIsRefreshing(true);
    try {
      await fetchPosts(false, true);
      setLastFetchTime(prev => ({
        ...prev,
        [activeTab]: Date.now()
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchPosts = async (isLoadMore = false, isRefresh = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else if (!isRefresh) {
      setIsLoading(true);
    }
    
    try {
      console.log(`Fetching posts for tab: ${activeTab}, page: ${page}`);
      
      let data;
      if (activeTab === 'following') {
        data = await API.getFollowingFeed(page, 10);
      } else {
        data = await API.getPosts(page, 10);
      }

      console.log('Received data:', data);

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
      
      console.log('Processed posts array:', postsArray);
      
      if (isLoadMore) {
        setPosts(prev => {
          const newPosts = [...prev, ...postsArray];
          // Update cache with merged posts
          saveToCache(newPosts);
          return newPosts;
        });
      } else {
        setPosts(postsArray);
        // Update cache
        saveToCache(postsArray);
      }
      
      // Check if there are more posts to load
      const moreAvailable = data?.hasMore || data?.has_more || postsArray.length === 10;
      setHasMore(moreAvailable);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchMorePosts = () => {
    fetchPosts(true);
  };

  const handleLike = useCallback(async (postId) => {
    try {
      const postToUpdate = posts.find(p => p._id === postId);
      const isAlreadyLiked = postToUpdate?.likes?.includes(currentUser?._id) || 
                            postToUpdate?.likes?.includes(currentUser?.id);
      
      await API.likePost(postId);
      
      setPosts(prev => {
        const updatedPosts = prev.map(post => {
          if (post._id === postId) {
            const newLikesCount = isAlreadyLiked 
              ? Math.max(0, (post.likesCount || post.likes?.length || 1) - 1) 
              : (post.likesCount || post.likes?.length || 0) + 1;
            
            const newLikes = isAlreadyLiked
              ? (post.likes || []).filter(id => id !== currentUser?._id && id !== currentUser?.id)
              : [...(post.likes || []), currentUser?._id || currentUser?.id];
              
            return {
              ...post,
              likes: newLikes,
              likesCount: newLikesCount,
              isLiked: !isAlreadyLiked
            };
          }
          return post;
        });
        // Update cache after like
        saveToCache(updatedPosts);
        return updatedPosts;
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  }, [posts, currentUser]);

  const handleBookmark = useCallback(async (postId) => {
    try {
      await API.bookmarkPost(postId);
      setPosts(prev => {
        const updatedPosts = prev.map(post => 
          post._id === postId 
            ? { ...post, bookmarked: !post.bookmarked } 
            : post
        );
        // Update cache after bookmark
        saveToCache(updatedPosts);
        return updatedPosts;
      });
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  }, []);

  const handleComment = useCallback(async (postId, text) => {
    try {
      const data = await API.commentOnPost(postId, text);
      const newComment = data.comment || {
        _id: Date.now().toString(),
        text,
        user: currentUser,
        createdAt: new Date().toISOString()
      };
      
      setPosts(prev => {
        const updatedPosts = prev.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                comments: [...(post.comments || []), newComment],
                commentsCount: (post.commentsCount || post.comments?.length || 0) + 1
              } 
            : post
        );
        // Update cache after comment
        saveToCache(updatedPosts);
        return updatedPosts;
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [currentUser]);

  const handleDeletePost = useCallback(async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await API.deletePost(postId);
      setPosts(prev => {
        const updatedPosts = prev.filter(post => post._id !== postId);
        // Update cache after delete
        saveToCache(updatedPosts);
        return updatedPosts;
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  }, []);

  const handleCreatePostSubmit = async (formData) => {
    try {
      await API.createPost(formData);
      setShowCreatePost(false);
      // Refresh both tabs after new post
      refreshPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post._id}`, { state: { post } });
  };

  const switchTab = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handlePullToRefresh = useCallback(() => {
    refreshPosts();
  }, []);

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
            {/* Feed Tabs with Refresh Indicator */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '24px',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              padding: '0 16px',
              position: 'relative'
            }}>
              <button
                onClick={() => switchTab('forYou')}
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
                onClick={() => switchTab('following')}
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
              
              {/* Pull to refresh indicator */}
              {isRefreshing && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '8px',
                  background: 'var(--card-bg)',
                  borderBottom: '1px solid var(--border-color)',
                  zIndex: 10
                }}>
                  <div className="loading-spinner small"></div>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    Refreshing...
                  </span>
                </div>
              )}
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