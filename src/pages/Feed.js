// Feed.js - Updated with proper design
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import Sidebar from '../components/Sidebar';
import { FiPlus } from 'react-icons/fi';
import API from '../utils/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchPosts();
  }, []);

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
      await API.likePost(postId);
      // Optimistically update the UI
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes?.includes(user?._id);
          const likesCount = (post.likesCount || post.likes?.length || 0) + (isLiked ? -1 : 1);
          return {
            ...post,
            likes: isLiked 
              ? post.likes?.filter(id => id !== user?._id)
              : [...(post.likes || []), user?._id],
            likesCount
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      fetchPosts(); // Refresh on error
    }
  };

  const handleComment = async (postId, text) => {
    try {
      await API.commentOnPost(postId, text);
      fetchPosts(); // Refresh posts
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  const handleBookmark = async (postId) => {
    try {
      await API.bookmarkPost(postId);
      // Optimistically update the UI
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return { ...post, bookmarked: !post.bookmarked };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await API.deletePost(postId);
      setPosts(posts.filter(post => post._id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleCreatePost = async (formData) => {
    try {
      await API.createPost(formData);
      fetchPosts();
      setShowCreatePost(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  return (
    <>
      <Navbar user={user} />
      
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
                <p className="empty-text">Start following people to see their posts here.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreatePost(true)}
                >
                  Create Your First Post
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