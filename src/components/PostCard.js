import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiHeart, FiMessageCircle, FiSend, FiBookmark,
  FiMoreVertical, FiTrash2
} from 'react-icons/fi';
import { FaHeart, FaBookmark } from 'react-icons/fa';
import VideoPlayer from './VideoPlayer';

const PostCard = ({ post, currentUser, onLike, onComment, onBookmark, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser?.id) || false);
  const [isBookmarked, setIsBookmarked] = useState(post.bookmarked || false);

  const handleLike = async () => {
    try {
      await onLike(post._id);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      await onBookmark(post._id);
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await onComment(post._id, commentText);
      setCommentText('');
      setShowComments(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleVideoDoubleClick = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    const media = post.media[0];
    
    if (media.type === 'video') {
      return (
        <VideoPlayer
          src={media.url}
          postId={post._id}
          onDoubleClick={handleVideoDoubleClick}
        />
      );
    } else {
      return (
        <img
          src={media.url}
          alt="Post"
          className="post-image"
          onDoubleClick={handleVideoDoubleClick}
        />
      );
    }
  };

  return (
    <article className="post-card">
      <header className="post-header">
        <Link to={`/profile/${post.user?.username}`}>
          <img
            src={post.user?.profilePicture || '/default-avatar.png'}
            alt={post.user?.username}
            className="user-avatar"
          />
        </Link>
        
        <div className="post-header-info">
          <Link to={`/profile/${post.user?.username}`} className="post-username">
            {post.user?.username}
          </Link>
          <span className="post-time">{formatTime(post.createdAt)}</span>
        </div>
        
        {post.user?.id === currentUser?.id && (
          <button className="post-more" onClick={() => onDelete(post._id)}>
            <FiTrash2 size={18} />
          </button>
        )}
      </header>

      <div className="post-media">
        {renderMedia()}
      </div>

      <div className="post-actions">
        <button 
          className={`post-action ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {isLiked ? <FaHeart size={24} /> : <FiHeart size={24} />}
        </button>
        
        <button 
          className="post-action"
          onClick={() => setShowComments(!showComments)}
        >
          <FiMessageCircle size={24} />
        </button>
        
        <button className="post-action">
          <FiSend size={24} />
        </button>
        
        <button 
          className={`post-action post-action-right ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmark}
        >
          {isBookmarked ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
        </button>
      </div>

      <div className="post-likes">
        {post.likes?.length || 0} likes
      </div>

      {post.caption && (
        <div className="post-caption">
          <Link to={`/profile/${post.user?.username}`} className="post-caption-username">
            {post.user?.username}
          </Link>
          <span className="post-caption-text">{post.caption}</span>
        </div>
      )}

      {post.comments?.length > 0 && (
        <button 
          className="post-comments-link"
          onClick={() => setShowComments(!showComments)}
        >
          View all {post.comments.length} comments
        </button>
      )}

      {showComments && post.comments && (
        <div className="post-comments">
          {post.comments.slice(0, 3).map((comment, index) => (
            <div key={index} className="comment">
              <Link to={`/profile/${comment.user?.username}`} className="comment-username">
                {comment.user?.username}
              </Link>
              <span className="comment-text">{comment.text}</span>
            </div>
          ))}
        </div>
      )}

      <form className="post-comment-form" onSubmit={handleCommentSubmit}>
        <input
          type="text"
          className="post-comment-input"
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        <button 
          type="submit" 
          className="post-comment-submit"
          disabled={!commentText.trim()}
        >
          Post
        </button>
      </form>
    </article>
  );
};

export default PostCard;