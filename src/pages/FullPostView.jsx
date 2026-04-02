import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import API from '../utils/api';

export default function FullPostView({ currentUser, unreadCounts }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const statePost = location.state?.post;
  const [post, setPost] = useState(statePost || null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(!statePost);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!statePost) fetchPost();
    fetchComments();
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await API.getPost(postId);
      setPost(data.post || data);
    } catch (err) {
      setError(err.message || 'Could not load this post.');
    }
    finally { setLoading(false); }
  };

  const fetchComments = async () => {
    try {
      const data = await API.getPostComments(postId);
      setComments(Array.isArray(data) ? data : data.comments || []);
    } catch { setComments([]); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await API.commentOnPost(postId, newComment.trim());
      const comment = data.comment || { text: newComment, userId: currentUser, createdAt: new Date().toISOString() };
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch { }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (error) return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center gap-3">
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-discord-text">Post</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4">
          <p className="text-discord-muted text-sm">This post could not be loaded.</p>
          <p className="text-discord-muted text-xs opacity-60">{error}</p>
          <button
            className="discord-btn px-4 py-2 rounded-lg text-sm"
            onClick={() => navigate('/')}
          >
            Back to feed
          </button>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center gap-3">
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-discord-text">Post</h1>
        </div>

        {post && <PostCard post={post} currentUser={currentUser} onDelete={() => navigate('/')} />}

        <div className="border-t border-discord-hover">
          <div className="px-4 py-3 border-b border-discord-hover">
            <h3 className="font-semibold text-discord-text text-sm">{comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}</h3>
          </div>

          {/* Comment Input */}
          {currentUser && (
            <form onSubmit={handleComment} className="px-4 py-3 border-b border-discord-hover flex gap-3">
              <Avatar user={currentUser} size={36} />
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Reply to this post..."
                  className="discord-input flex-1 text-sm py-2"
                />
                <button type="submit" disabled={!newComment.trim() || submitting} className="discord-btn p-2 rounded-lg disabled:opacity-40">
                  <FiSend size={14} />
                </button>
              </div>
            </form>
          )}

          {/* Comments */}
          {comments.length === 0 ? (
            <div className="text-center py-10 text-discord-muted">
              <p className="text-sm">No replies yet. Be the first!</p>
            </div>
          ) : comments.map((c, i) => {
            const author = c.userId || c.user || { username: c.username };
            return (
              <div key={c._id || i} className="flex gap-3 px-4 py-3 border-b border-discord-hover hover:bg-discord-hover transition-colors">
                <Avatar user={author} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-discord-text text-sm cursor-pointer hover:underline" onClick={() => navigate(`/profile/${author.username}`)}>
                      {author.name || author.username}
                    </span>
                    <span className="text-discord-muted text-xs">
                      {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className="text-discord-text text-sm whitespace-pre-wrap break-words">
                    <FormattedText text={c.text || c.content} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
