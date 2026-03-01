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

  // Use refs to track state
  const initialLoadRef = useRef(true);
  const isFetchingRef = useRef(false);
  const tabChangeRef = useRef(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    // Fetch posts immediately on mount with a slight delay to ensure API is ready
    setTimeout(() => {
      fetchPosts();
    }, 100);

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
    if (!initialLoadRef.current) {
      // Mark that we're changing tabs
      tabChangeRef.current = true;
      
      // Reset everything
      setPosts([]);
      setPage(1);
      setHasMore(true);
      
      // Small delay to ensure state updates before fetching
      setTimeout(() => {
        fetchPosts();
        tabChangeRef.current = false;
      }, 50);
    }
  }, [activeTab]);

  // Load more when scroll reaches bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore && !isFetchingRef.current && posts.length > 0) {
      setPage(prev => prev + 1);
    }
  }, [inView, hasMore, isLoading, isLoadingMore, posts.length]);

  // Fetch more posts when page changes
  useEffect(() => {
    if (page > 1) {
      fetchPosts(true);
    }
  }, [page]);

  const fetchPosts = async (isLoadMore = false) => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) return;
    
    // Don't fetch if we're already loading more and this isn't a load more request
    if (isLoadingMore && !isLoadMore) return;
    
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    isFetchingRef.current = true;
    
    try {
      console.log(`Fetching posts for tab: ${activeTab}, page: ${page}, loadMore: ${isLoadMore}`);
      
      let data;
      let postsArray = [];
      
      // Try to fetch with retry logic for initial load
      if (activeTab === 'following') {
        data = await API.getFollowingFeed(page, 10);
      } else {
        data = await API.getPosts(page, 10);
      }

      console.log('Received data:', data);

      // Extract posts array from various possible response formats
      if (Array.isArray(data)) {
        postsArray = data;
      } else if (data && data.posts && Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else if (data && data.data && Array.isArray(data.data)) {
        postsArray = data.data;
      } else if (data && data.results && Array.isArray(data.results)) {
        postsArray = data.results;
      } else if (data && typeof data === 'object') {
        // Try to find any array property in the response
        const arrays = Object.values(data).filter(val => Array.isArray(val));
        if (arrays.length > 0) {
          postsArray = arrays[0];
        }
      }
      
      console.log('Processed posts array:', postsArray);
      
      // Update posts based on whether it's load more or not
      if (isLoadMore) {
        setPosts(prev => {
          // Filter out duplicates by _id
          const existingIds = new Set(prev.map(p => p._id));
          const newPosts = postsArray.filter(p => !existingIds.has(p._id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(postsArray);
      }
      
      // Check if there are more posts to load
      // Different APIs might return this differently
      const morePosts = data?.hasMore || 
                       data?.has_more || 
                       data?.nextPage || 
                       postsArray.length === 10 ||
                       (data?.total && data.total > page * 10);
      
      setHasMore(!!morePosts);
      
      // If this is the initial load and we got no posts, try one more time after a delay
      if (!isLoadMore && postsArray.length === 0 && initialLoadRef.current) {
        setTimeout(() => {
          if (posts.length === 0 && !isFetchingRef.current) {
            console.log('Retrying initial fetch...');
            fetchPosts();
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      
      // If error on initial load, try again after delay
      if (initialLoadRef.current) {
        setTimeout(() => {
          if (!isFetchingRef.current) {
            console.log('Retrying after error...');
            fetchPosts();
          }
        }, 3000);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
      initialLoadRef.current = false;
    }
  };

  const handleLike = useCallback(async (postId) => {
    try {
      const postToUpdate = posts.find(p => p._id === postId);
      const isAlreadyLiked = postToUpdate?.likes?.includes(currentUser?._id) || 
                            postToUpdate?.likes?.includes(currentUser?.id);
      
      await API.likePost(postId);
      
      setPosts(prev => prev.map(post => {
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
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  }, [posts, currentUser]);

  const handleBookmark = useCallback(async (postId) => {
    try {
      await API.bookmarkPost(postId);
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, bookmarked: !post.bookmarked } 
          : post
      ));
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
      
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { 
              ...post, 
              comments: [...(post.comments || []), newComment],
              commentsCount: (post.commentsCount || post.comments?.length || 0) + 1
            } 
          : post
      ));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [currentUser]);

  const handleDeletePost = useCallback(async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await API.deletePost(postId);
      setPosts(prev => prev.filter(post => post._id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  }, []);

  const handleCreatePostSubmit = async (formData) => {
    try {
      await API.createPost(formData);
      setShowCreatePost(false);
      
      // Refresh posts after creating new post
      setPosts([]);
      setPage(1);
      setHasMore(true);
      
      // Small delay to ensure cache is cleared
      setTimeout(() => {
        fetchPosts();
      }, 100);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post._id}`, { state: { post } });
  };

  const calculateEngagementScore = (post) => {
    let score = (post.likesCount || post.likes?.length || 0) * 2;
    score += (post.commentsCount || post.comments?.length || 0) * 3;
    
    if (post.media && post.media.some(m => m.type === 'video')) {
      score += 10;
    }
    
    const hoursSincePosted = (new Date() - new Date(post.createdAt)) / (1000 * 60 * 60);
    if (hoursSincePosted < 24) {
      score += (24 - hoursSincePosted) * 0.5;
    }
    
    return score;
  };

  // Show skeletons while loading initial posts
  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page">
        <Navbar user={currentUser} />
        <main className="main-content">
          <div className="feed-layout">
            <div className="posts-container">
              {/* Feed Tabs - Show during loading */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '24px',
                background: 'var(--card-bg)',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                padding: '0 16px'
              }}>
                <button
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'forYou' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === 'forYou' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'forYou' ? '600' : '400',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <FiHome size={18} />
                  For You
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'following' ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === 'following' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'following' ? '600' : '400',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <FiUsers size={18} />
                  Following
                </button>
              </div>
              
              {/* Skeleton Loaders */}
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
                {activeTab === 'forYou' ? (
                  [...posts].sort((a, b) => {
                    const aScore = calculateEngagementScore(a);
                    const bScore = calculateEngagementScore(b);
                    const aHasVideo = a.media && a.media.some(m => m.type === 'video');
                    const bHasVideo = b.media && b.media.some(m => m.type === 'video');
                    
                    if (aHasVideo === bHasVideo) {
                      const aRandomFactor = aHasVideo ? 0.7 + Math.random() * 0.3 : 1.0;
                      const bRandomFactor = bHasVideo ? 0.7 + Math.random() * 0.3 : 1.0;
                      return (bScore * bRandomFactor) - (aScore * aRandomFactor);
                    }
                    
                    return bHasVideo ? 1 : -1;
                  }).map((post) => (
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
                  ))
                ) : (
                  posts.map((post) => (
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
                  ))
                )}
                
                {/* Loading indicator and intersection observer target */}
                {isLoadingMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div className="loading-spinner"></div>
                  </div>
                )}
                
                {hasMore && posts.length > 0 && (
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