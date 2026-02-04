import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import Sidebar from '../components/Sidebar';
import { FiPlus } from 'react-icons/fi';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    notifications: 0
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchPosts();
    fetchUnreadCounts();
  }, []);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://vesselx.onrender.com/api/posts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      // Fetch unread counts from API
      // This is a placeholder - implement based on your API
      setUnreadCounts({
        messages: 3,
        notifications: 5
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  const handleBookmark = async (postId) => {
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`https://vesselx.onrender.com/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleCreatePost = async (formData) => {
    try {
      const response = await fetch('https://vesselx.onrender.com/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <>
      <Navbar user={user} unreadCounts={unreadCounts} />
      
      <main className="main-content">
        <div className="feed-layout">
          <div className="posts-container">
            {isLoading ? (
              <div className="loading-page">
                <span className="loading-spinner"></span>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📷</div>
                <h3 className="empty-title">No Posts Yet</h3>
                <p className="empty-text">When people share photos, you'll see them here.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreatePost(true)}
                >
                  Create Post
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  currentUser={user}
                  onLike={handleLike}
                  onComment={handleComment}
                  onBookmark={handleBookmark}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>

          <Sidebar currentUser={user} />
        </div>
      </main>

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onSubmit={handleCreatePost}
        />
      )}

      <button 
        className="floating-create-btn"
        onClick={() => setShowCreatePost(true)}
      >
        <FiPlus size={24} />
      </button>
    </>
  );
};

export default Feed;