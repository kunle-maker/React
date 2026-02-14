import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VideoPlayer from '../components/VideoPlayer';
import { 
  FiHeart, FiMessageCircle, FiSend, FiBookmark, 
  FiX, FiMoreVertical, FiTrash2, FiChevronLeft,
  FiChevronRight, FiUsers, FiShare2
} from 'react-icons/fi';
import { FaHeart, FaBookmark } from 'react-icons/fa';
import API from '../utils/api';
import { copyToClipboard } from '../utils/clipboard';

const FullPostView = () => {
  const { postId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(location.state?.post || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!post);
  const [commentText, setCommentText] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    if (!post) {
      fetchPost();
    } else {
      // Initialize state from passed post
      setIsLiked(post.likes?.includes(user?._id) || post.likes?.includes(user?.id) || post.isLiked || false);
      setIsBookmarked(post.bookmarked || false);
      setLikesCount(post.likesCount || post.likes?.length || 0);
      setComments(post.comments || []);
    }
  }, [postId, post]);

  const fetchPost = async () => {
    setIsLoading(true);
    try {
      // Try to get post from session storage first
      const cachedPost = sessionStorage.getItem(`post_${postId}`);
      if (cachedPost) {
        const parsedPost = JSON.parse(cachedPost);
        setPost(parsedPost);
        setIsLiked(parsedPost.likes?.includes(currentUser?._id) || parsedPost.likes?.includes(currentUser?.id) || false);
        setIsBookmarked(parsedPost.bookmarked || false);
        setLikesCount(parsedPost.likesCount || parsedPost.likes?.length || 0);
        setComments(parsedPost.comments || []);
      } else {
        // Fetch from API
        await fetchPostFromAPI();
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPostFromAPI = async () => {
    try {
      // Try to fetch all posts and find the matching one
      const data = await API.getPosts();
      const foundPost = data.posts?.find(p => p._id === postId) || 
                       data.posts?.find(p => p.id === postId);
      
      if (foundPost) {
        setPostData(foundPost);
      } else {
        // If not found in feed, try to get it from the post author's posts
        const allPosts = await fetchRecentPosts();
        const postFromAll = allPosts.find(p => p._id === postId);
        if (postFromAll) {
          setPostData(postFromAll);
        } else {
          console.error('Post not found');
        }
      }
    } catch (error) {
      console.error('Error fetching post from API:', error);
    }
  };

  const fetchRecentPosts = async () => {
    try {
      // Fetch a larger set of posts
      const feedData = await API.request('/api/posts?limit=100');
      return feedData.posts || feedData || [];
    } catch (error) {
      console.error('Error fetching recent posts:', error);
      return [];
    }
  };

  const setPostData = (postData) => {
    setPost(postData);
    setIsLiked(postData.likes?.includes(currentUser?._id) || postData.likes?.includes(currentUser?.id) || false);
    setIsBookmarked(postData.bookmarked || false);
    setLikesCount(postData.likesCount || postData.likes?.length || 0);
    setComments(postData.comments || []);
    
    // Cache the post data
    sessionStorage.setItem(`post_${postId}`, JSON.stringify(postData));
  };

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const data = await API.likePost(postId);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      
      // Update cached post
      if (post) {
        const updatedPost = {
          ...post,
          likesCount: isLiked ? likesCount - 1 : likesCount + 1,
          likes: isLiked 
            ? (post.likes?.filter(id => id !== currentUser._id && id !== currentUser.id) || [])
            : [...(post.likes || []), currentUser._id || currentUser.id]
        };
        sessionStorage.setItem(`post_${postId}`, JSON.stringify(updatedPost));
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      await API.bookmarkPost(postId);
      setIsBookmarked(!isBookmarked);
      
      // Update cached post
      if (post) {
        const updatedPost = {
          ...post,
          bookmarked: !isBookmarked
        };
        sessionStorage.setItem(`post_${postId}`, JSON.stringify(updatedPost));
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    try {
      const data = await API.commentOnPost(postId, commentText);
      // Use data from backend if available, otherwise fallback
      const newComment = data.comment || {
        _id: Date.now().toString(),
        text: commentText,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          name: currentUser.name,
          profilePicture: currentUser.profilePicture
        },
        createdAt: new Date().toISOString()
      };
      
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      
      // Update cached post
      if (post) {
        const updatedPost = {
          ...post,
          comments: [newComment, ...(post.comments || [])],
          commentsCount: (post.commentsCount || 0) + 1
        };
        sessionStorage.setItem(`post_${postId}`, JSON.stringify(updatedPost));
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await API.deletePost(postId);
      // Remove from cache
      sessionStorage.removeItem(`post_${postId}`);
      navigate(-1); // Go back to previous page
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    const success = await copyToClipboard(postUrl);
    
    if (success) {
      alert('Post link copied to clipboard!');
    } else {
      alert('Could not copy link. Please copy it manually: ' + postUrl);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="error-page">
        <Navbar user={currentUser} />
        <div className="empty-state" style={{ marginTop: '80px' }}>
          <div className="empty-icon">📷</div>
          <h3>Post Not Found</h3>
          <p>The post you're looking for doesn't exist or has been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const postUser = post.user || post.userId || post.author || {
    _id: post.userId?._id || post.user?._id,
    username: post.username || 'user',
    name: post.name || 'VesselX User',
    profilePicture: post.userProfilePicture || post.user?.profilePicture || '/default-avatar.png'
  };

  const getProfilePicture = (userObj) => {
    const user = userObj || postUser;
    if (!user?.profilePicture) return '/default-avatar.png';
    if (user.profilePicture.startsWith('http')) return user.profilePicture;
    return `https://vesselx.onrender.com/api/media/${user.profilePicture}`;
  };

  const isOwnPost = currentUser && (currentUser._id === postUser._id || currentUser.username === postUser.username);

  return (
    <div className="full-post-page">
      <Navbar user={currentUser} />
      
      <div className="full-post-container">
        {/* Media Section */}
        <div className="post-media-section">
          {post.media && post.media.length > 0 && (
            <>
              {post.media[currentMediaIndex].type === 'video' ? (
                <VideoPlayer 
                  src={post.media[currentMediaIndex].url}
                  onDoubleClick={handleLike}
                />
              ) : (
                <img 
                  src={post.media[currentMediaIndex].url} 
                  alt="Post" 
                  className="post-full-image"
                  onClick={handleLike}
                  onDoubleClick={handleLike}
                />
              )}
              
              {/* Media Navigation */}
              {post.media.length > 1 && (
                <>
                  {currentMediaIndex > 0 && (
                    <button 
                      className="media-nav-btn prev"
                      onClick={() => setCurrentMediaIndex(prev => prev - 1)}
                    >
                      <FiChevronLeft size={24} />
                    </button>
                  )}
                  
                  {currentMediaIndex < post.media.length - 1 && (
                    <button 
                      className="media-nav-btn next"
                      onClick={() => setCurrentMediaIndex(prev => prev + 1)}
                    >
                      <FiChevronRight size={24} />
                    </button>
                  )}
                  
                  {/* Media Indicators */}
                  <div className="media-indicators">
                    {post.media.map((_, index) => (
                      <div 
                        key={index}
                        className={`media-indicator ${index === currentMediaIndex ? 'active' : ''}`}
                        onClick={() => setCurrentMediaIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Info Section */}
        <div className="post-info-section">
          {/* Header - This shows the user info */}
          <div className="post-header-full">
            <div className="post-user-info">
              <Link to={`/profile/${postUser.username}`}>
                <img
                  src={getProfilePicture(postUser)}
                  alt={postUser.username}
                  className="user-avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${postUser.username}&background=random`;
                  }}
                />
              </Link>
              <div className="post-user-details">
                <Link to={`/profile/${postUser.username}`} className="post-username">
                  {postUser.username}
                </Link>
                {post.location && (
                  <div className="post-location">{post.location}</div>
                )}
              </div>
            </div>
            
            <div className="post-options-wrapper">
              <button 
                className="post-options-btn"
                onClick={() => setShowOptions(!showOptions)}
              >
                <FiMoreVertical size={24} />
              </button>
              
              {showOptions && (
                <div className="post-options-menu">
                  <button 
                    onClick={handleShare}
                    className="post-option-item"
                  >
                    <FiShare2 size={16} /> Copy Link
                  </button>
                  
                  {isOwnPost && (
                    <>
                      <div className="options-divider"></div>
                      <button 
                        onClick={handleDeletePost}
                        className="post-option-item delete"
                      >
                        <FiTrash2 size={16} /> Delete Post
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Comments Section */}
          <div className="comments-scroll">
            {/* Caption */}
            <div className="post-caption-full">
              <div className="caption-container">
                <div className="caption-content">
                  <div className="caption-text">
                    <Link to={`/profile/${postUser.username}`} className="caption-username">
                      {postUser.username}
                    </Link>
                    <span className="caption-text-content">
                      {post.caption}
                    </span>
                  </div>
                  <div className="caption-time">
                    {formatTime(post.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Comments */}
            {comments.length > 0 ? (
              <div className="comments-list">
                {comments.map(comment => {
                  const commentUser = comment.user || {};
                  return (
                    <div key={comment._id} className="comment-item">
                      <Link to={`/profile/${commentUser.username}`}>
                        <img
                          src={getProfilePicture(commentUser)}
                          alt={commentUser.username}
                          className="comment-user-avatar"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${commentUser.username || 'User'}&background=random`;
                          }}
                        />
                      </Link>
                      <div className="comment-content">
                        <div className="comment-header">
                          <Link to={`/profile/${commentUser.username}`} className="comment-username">
                            {commentUser.username || commentUser.name || 'User'}
                          </Link>
                          <span className="comment-text">
                            {comment.text}
                          </span>
                        </div>
                        <div className="comment-time">
                          {formatTime(comment.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-comments">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
          
          {/* Actions Section */}
          <div className="post-actions-full">
            {/* Action Buttons */}
            <div className="post-actions-row">
              <div className="post-actions-left">
                <button 
                  className={`post-action-btn ${isLiked ? 'liked' : ''}`}
                  onClick={handleLike}
                >
                  {isLiked ? <FaHeart size={24} /> : <FiHeart size={24} />}
                </button>
                <button className="post-action-btn">
                  <FiMessageCircle size={24} />
                </button>
                <button 
                  className="post-action-btn"
                  onClick={handleShare}
                >
                  <FiSend size={24} />
                </button>
              </div>
              
              <button 
                className={`post-action-btn ${isBookmarked ? 'bookmarked' : ''}`}
                onClick={handleBookmark}
              >
                {isBookmarked ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
              </button>
            </div>
            
            {/* Likes Count */}
            <div className="post-likes-count">
              {likesCount.toLocaleString()} likes
            </div>
            
            {/* Timestamp */}
            <div className="post-timestamp">
              {formatTime(post.createdAt)}
            </div>
            
            {/* Add Comment */}
            {currentUser && (
              <form onSubmit={handleCommentSubmit} className="add-comment-form">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="comment-input"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className={`comment-submit-btn ${commentText.trim() ? 'active' : ''}`}
                >
                  Post
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      {/* Close Button */}
      <button 
        className="close-full-post-btn"
        onClick={() => navigate(-1)}
      >
        <FiX size={24} />
      </button>
    </div>
  );
};

export default FullPostView;