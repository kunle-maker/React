import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlusSquare, FiHome, FiUsers
} from 'react-icons/fi';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import API from '../utils/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('forYou'); // 'forYou' or 'following'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const navigate = useNavigate();
  const observerRef = useRef();
  const videoObserverRef = useRef();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    fetchPosts();

    const handleOpenCreatePost = () => {
      setShowCreatePost(true);
    };
    window.addEventListener('openCreatePostModal', handleOpenCreatePost);

    return () => {
      window.removeEventListener('openCreatePostModal', handleOpenCreatePost);
    };
  }, []);

  // Fetch posts when tab changes
  useEffect(() => {
    setPosts([]);
    setPage(1);
    fetchPosts();
  }, [activeTab]);

  // Setup intersection observer for pagination
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        setPage(prev => prev + 1);
      }
    }, options);

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [hasMore, isLoading]);

  // Fetch more posts when page changes
  useEffect(() => {
    if (page > 1) {
      fetchPosts(true);
    }
  }, [page]);

  // Setup Intersection Observer for auto-playing videos in feed
  useEffect(() => {
    if (posts.length === 0) return;

    // Delay observation to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (video) {
              if (entry.isIntersecting) {
                // Small delay to ensure video is ready
                setTimeout(() => {
                  if (video) {
                    video.muted = true;
                    video.play()
                      .then(() => {
                        console.log('Video playing in view');
                      })
                      .catch(e => {
                        console.log("Autoplay prevented:", e);
                        // Add click handler for manual play
                        video.addEventListener('click', function playOnClick() {
                          video.play();
                          video.removeEventListener('click', playOnClick);
                        }, { once: true });
                      });
                  }
                }, 100);
              } else {
                video.pause();
              }
            }
          });
        },
        { threshold: 0.5 }
      );

      const postCards = document.querySelectorAll('.post-card');
      postCards.forEach(card => observer.observe(card));
      
      videoObserverRef.current = observer;
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (videoObserverRef.current) {
        videoObserverRef.current.disconnect();
      }
    };
  }, [posts]);

  const fetchPosts = async (isLoadMore = false) => {
    if (!isLoadMore) {
      setIsLoading(true);
    }
    
    try {
      let data;
      
      if (activeTab === 'following') {
        data = await API.getFollowingFeed(page, 10);
        console.log('Following Feed RAW Data:', data);
      } else {
        data = await API.getPosts();
      }

      console.log('API Response:', data);
      
      // Handle different response formats
      let postsArray = [];
      
      if (Array.isArray(data)) {
        postsArray = data;
      } else if (data && Array.isArray(data.posts)) {
        postsArray = data.posts;
      } else if (data && data.data && Array.isArray(data.data)) {
        postsArray = data.data;
      } else if (data && typeof data === 'object') {
        // Check if any property is an array of posts
        const arrays = Object.values(data).filter(Array.isArray);
        if (arrays.length > 0) {
          postsArray = arrays[0];
        }
      }
      
      if (isLoadMore) {
        setPosts(prev => [...prev, ...postsArray]);
      } else {
        setPosts(postsArray);
      }
      setHasMore(data?.hasMore || data?.has_more || false);
      setTotalPages(data?.totalPages || data?.total_pages || 1);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const postToUpdate = posts.find(p => p._id === postId);
      const isAlreadyLiked = postToUpdate?.likes?.includes(currentUser?._id) || 
                            postToUpdate?.likes?.includes(currentUser?.id);
      
      await API.likePost(postId);
      
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const newLikesCount = isAlreadyLiked 
            ? Math.max(0, (post.likesCount || post.likes?.length || 1) - 1) 
            : (post.likesCount || post.likes?.length || 0) + 1;
          
          const newLikes = isAlreadyLiked
            ? post.likes.filter(id => id !== currentUser?._id && id !== currentUser?.id)
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
  };

  const handleBookmark = async (postId) => {
    try {
      await API.bookmarkPost(postId);
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, bookmarked: !post.bookmarked } 
          : post
      ));
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const data = await API.commentOnPost(postId, text);
      const newComment = data.comment || {
        _id: Date.now().toString(),
        text,
        user: currentUser,
        createdAt: new Date().toISOString()
      };
      
      setPosts(posts.map(post => 
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
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await API.deletePost(postId);
      setPosts(posts.filter(post => post._id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleCreatePostSubmit = async (formData) => {
    try {
      await API.createPost(formData);
      setShowCreatePost(false);
      // Refresh the current feed
      setPage(1);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post._id}`);
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

  const switchTab = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  if (isLoading && posts.length === 0) {
    return (
      <div className="feed-page">
        <Navbar user={currentUser} />
        <main className="main-content">
          <div className="feed-layout">
            <div className="posts-container">
              <div className="loading-page">
                <div className="loading-spinner"></div>
              </div>
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
                  // For You feed - with engagement sorting
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
                  // Following feed - chronological order
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
                {isLoading && posts.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div className="loading-spinner"></div>
                  </div>
                )}
                
                {hasMore && activeTab === 'following' && (
                  <div ref={observerRef} style={{ height: '20px', margin: '20px 0' }} />
                )}
                
                {!hasMore && activeTab === 'following' && posts.length > 0 && (
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