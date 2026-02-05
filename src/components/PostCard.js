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
      setIsLiked(!isLiked);
      await onLike(post._id);
    } catch (error) {
      setIsLiked(isLiked); // Rollback
      console.error('Error liking post:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      setIsBookmarked(!isBookmarked);
      await onBookmark(post._id);
    } catch (error) {
      setIsBookmarked(isBookmarked); // Rollback
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <article className="post-card">
      <header style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={post.user?.profilePicture || 'https://via.placeholder.com/40'}
            alt={post.user?.username}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{post.user?.name || post.user?.username}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Demo user</div>
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--text-dim)' }}>
          <FiMoreVertical size={20} />
        </button>
      </header>

      <div style={{ padding: '0 12px 12px' }}>
        <p style={{ fontSize: '15px', lineHeight: '1.5', color: 'var(--text-primary)' }}>{post.caption}</p>
      </div>

      {post.media && post.media.length > 0 && (
        <div style={{ width: '100%', maxHeight: '500px', overflow: 'hidden' }}>
          {post.media[0].type === 'video' ? (
            <VideoPlayer src={post.media[0].url} />
          ) : (
            <img src={post.media[0].url} alt="Post" style={{ width: '100%', display: 'block' }} />
          )}
        </div>
      )}

      <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={handleLike} style={{ background: 'none', border: 'none', color: isLiked ? '#ed4956' : 'white', cursor: 'pointer' }}>
            {isLiked ? <FaHeart size={24} /> : <FiHeart size={24} />}
            <span style={{ marginLeft: '4px', fontSize: '14px' }}>{post.likes?.length || 0}</span>
          </button>
          <button onClick={() => setShowComments(!showComments)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <FiMessageCircle size={24} />
          </button>
        </div>
        <button onClick={handleBookmark} style={{ background: 'none', border: 'none', color: isBookmarked ? '#0095f6' : 'white', cursor: 'pointer' }}>
          {isBookmarked ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
        </button>
      </div>
    </article>
  );
};

export default PostCard;
