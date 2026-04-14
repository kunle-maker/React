import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiHeart, FiCornerDownRight, FiX } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import API from '../utils/api';

function CommentItem({ c, index, currentUser, postId, onReplyPosted }) {
  const navigate = useNavigate();
  const author = c.userId || c.user || { username: c.username };
  const [liked, setLiked] = useState(c.isLiked || false);
  const [likeCount, setLikeCount] = useState(c.likeCount || c.likes?.length || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState(c.replies || []);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef(null);

  const handleLike = async () => {
    try {
      const prev = liked;
      setLiked(!prev);
      setLikeCount(prev ? Math.max(0, likeCount - 1) : likeCount + 1);
      await API.likeComment(postId, c._id);
    } catch {
      setLiked(liked);
      setLikeCount(likeCount);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    try {
      const data = await API.replyToComment(postId, c._id, replyText.trim());
      const newReply = data.reply || data.comment || { text: replyText.trim(), userId: currentUser, createdAt: new Date().toISOString() };
      setReplies(prev => [...prev, newReply]);
      setReplyText('');
      setReplying(false);
      setShowReplies(true);
      onReplyPosted?.();
    } catch { }
    finally { setSubmittingReply(false); }
  };

  useEffect(() => {
    if (replying && replyInputRef.current) replyInputRef.current.focus();
  }, [replying]);

  const replyCount = c.replyCount || replies.length;

  return (
    <div className="border-b border-discord-hover/50">
      <div className="flex gap-3 px-4 py-3 hover:bg-discord-hover/20 transition-colors">
        <Avatar user={author} size={36} onClick={() => navigate(`/profile/${author.username}`)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
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
          <div className="flex items-center gap-4 mt-1.5">
            <button
              className={`flex items-center gap-1 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'text-discord-muted hover:text-red-400'}`}
              onClick={handleLike}
            >
              {liked ? <HiHeart size={14} /> : <FiHeart size={13} />}
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            {currentUser && (
              <button
                className="flex items-center gap-1 text-xs font-bold text-discord-muted hover:text-discord-text transition-colors"
                onClick={() => { setReplying(r => !r); setReplyText(`@${author.username} `); }}
              >
                <FiCornerDownRight size={12} /> Reply
              </button>
            )}
            {replyCount > 0 && (
              <button
                className="flex items-center gap-1 text-xs font-bold text-discord-brand hover:underline"
                onClick={async () => {
                  if (!showReplies && replies.length === 0) {
                    try {
                      const data = await API.replyToComment(postId, c._id, null);
                      if (data?.replies) setReplies(data.replies);
                    } catch {}
                  }
                  setShowReplies(r => !r);
                }}
              >
                <FiCornerDownRight size={12} /> {showReplies ? 'Hide' : 'View'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {replying && (
            <form onSubmit={handleReply} className="flex items-center gap-2 mt-2">
              <input
                ref={replyInputRef}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${author.username}...`}
                className="discord-input flex-1 text-xs py-1.5"
              />
              <button type="submit" disabled={!replyText.trim() || submittingReply} className="discord-btn p-1.5 rounded-lg disabled:opacity-40">
                <FiSend size={12} />
              </button>
              <button type="button" onClick={() => setReplying(false)} className="text-discord-muted hover:text-discord-text p-1">
                <FiX size={12} />
              </button>
            </form>
          )}
        </div>
      </div>

      {showReplies && replies.length > 0 && (
        <div className="pl-12 border-l-2 border-discord-hover/30 ml-7">
          {replies.map((r, ri) => {
            const ra = r.userId || r.user || { username: r.username };
            return (
              <div key={r._id || ri} className="flex gap-3 px-3 py-2.5 hover:bg-discord-hover/20 transition-colors">
                <Avatar user={ra} size={28} onClick={() => navigate(`/profile/${ra.username}`)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-discord-text text-xs cursor-pointer hover:underline" onClick={() => navigate(`/profile/${ra.username}`)}>
                      {ra.name || ra.username}
                    </span>
                    <span className="text-discord-muted text-[10px]">
                      {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className="text-discord-text text-xs whitespace-pre-wrap break-words">
                    <FormattedText text={r.text || r.content} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      const mentions = [...newComment.matchAll(/@(\w+)/g)].map(m => m[1]);
      const data = await API.commentOnPost(postId, newComment.trim(), mentions);
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
          <button className="discord-btn px-4 py-2 rounded-lg text-sm" onClick={() => navigate('/')}>
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

        {post && <PostCard post={post} currentUser={currentUser} onDelete={() => navigate('/')} onUpdate={setPost} />}

        <div className="border-t border-discord-hover">
          <div className="px-4 py-3 border-b border-discord-hover">
            <h3 className="font-semibold text-discord-text text-sm">{comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}</h3>
          </div>

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

          {comments.length === 0 ? (
            <div className="text-center py-10 text-discord-muted">
              <p className="text-sm">No replies yet. Be the first!</p>
            </div>
          ) : comments.map((c, i) => (
            <CommentItem
              key={c._id || i}
              c={c}
              index={i}
              currentUser={currentUser}
              postId={postId}
              onReplyPosted={() => {}}
            />
          ))}
        </div>
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
