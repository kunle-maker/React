import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlusSquare
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
  
  const navigate = useNavigate();

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

  useEffect(() => {
    // Setup Intersection Observer for auto-playing videos in feed
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const video = entry.target.querySelector('video');
          if (video) {
            if (entry.isIntersecting) {
              video.muted = true;
              video.play().catch(e => {
                console.log("Autoplay prevented:", e);
              });
            } else {
              video.pause();
              video.currentTime = 0;
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    const postCards = document.querySelectorAll('.post-card');
    postCards.forEach(card => observer.observe(card));

    return () => {
      postCards.forEach(card => observer.unobserve(card));
    };
  }, [posts]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const data = await API.getPosts();
      setPosts(data.posts || []);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const postToUpdate = posts.find(p => p._id === postId);
      const isAlreadyLiked = postToUpdate?.likes?.includes(currentUser?._id);
      
      await API.likePost(postId);
      
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const newLikesCount = isAlreadyLiked 
            ? Math.max(0, (post.likesCount || 1) - 1) 
            : (post.likesCount || 0) + 1;
          
          const newLikes = isAlreadyLiked
            ? post.likes.filter(id => id !== currentUser?._id)
            : [...(post.likes || []), currentUser?._id];
            
          return {
            ...post,
            likes: newLikes,
            likesCount: newLikesCount
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
              commentsCount: (post.commentsCount || 0) + 1
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

  if (isLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="feed-page">
      <Navbar user={currentUser} />
      
      <main className="main-content">
        <div className="feed-layout">
          <div className="posts-container">
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📷</div>
                <h2 className="empty-title">No posts yet</h2>
                <p className="empty-text">Follow more people to see their posts here</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreatePost(true)}
                >
                  Create your first post
                </button>
              </div>
            ) : (
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
                    if (!post.likes?.includes(currentUser?._id)) {
                      handleLike(postId);
                    }
                  }}
                />
              ))
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
