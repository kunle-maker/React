import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShare2, FiBookmark, FiMoreHorizontal, FiTrash2, FiCopy, FiExternalLink, FiSend, FiX } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';
import FormattedText from './FormattedText';
import LinkPreview from './LinkPreview';
import API from '../utils/api';

const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👍'];

export default function PostCard({ post, currentUser, onDelete, onUpdate }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(() => {
    if (post.isLiked !== undefined) return post.isLiked;
    if (currentUser && post.likes) {
      const myId = currentUser._id || currentUser.id;
      return post.likes.some(l => l === myId || l._id === myId);
    }
    return false;
  });
  const [likeCount, setLikeCount] = useState(post.likeCount || post.likes?.length || 0);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false);
  const [userReaction, setUserReaction] = useState(post.userReaction || null);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments?.length || 0);

  const menuRef = useRef(null);

  const author = post.userId || { username: post.username };
  const isOwn = currentUser && (author._id === currentUser._id || author.username === currentUser.username || post.username === currentUser.username);

  useEffect(() => {
    if (post.isLiked === undefined && currentUser) {
      API.getPost(post._id).then(data => {
        const p = data.post || data;
        if (p.isLiked !== undefined) {
          setLiked(p.isLiked);
        } else if (p.likes) {
          const myId = currentUser._id || currentUser.id;
          setLiked(p.likes.some(l => l === myId || l._id === myId));
        }
        if (p.likeCount !== undefined) setLikeCount(p.likeCount);
        if (p.isBookmarked !== undefined) setBookmarked(p.isBookmarked);
        if (p.userReaction !== undefined) setUserReaction(p.userReaction);
      }).catch(() => {});
    }
  }, [post._id]);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const prev = liked;
      setLiked(!prev);
      setLikeCount(prev ? likeCount - 1 : likeCount + 1);
      await API.likePost(post._id);
    } catch { setLiked(liked); setLikeCount(likeCount); }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    try {
      setBookmarked(!bookmarked);
      await API.bookmarkPost(post._id);
    } catch { setBookmarked(bookmarked); }
  };

  const handleReact = async (e, emoji) => {
    e.stopPropagation();
    setShowReactions(false);
    try {
      const prev = userReaction;
      setUserReaction(emoji === prev ? null : emoji);
      await API.reactToPost(post._id, emoji);
    } catch { setUserReaction(userReaction); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (!confirm('Delete this post?')) return;
    try {
      await API.deletePost(post._id);
      onDelete?.(post._id);
    } catch { alert('Failed to delete post'); }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    navigator.clipboard?.writeText(window.location.origin + `/#/post/${post._id}`);
  };

  const toggleComments = async (e) => {
    e.stopPropagation();
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && !commentsLoaded) {
      setCommentsLoading(true);
      try {
        const data = await API.getPostComments(post._id);
        const list = Array.isArray(data) ? data : data.comments || [];
        setComments(list);
        setCommentCount(list.length);
        setCommentsLoaded(true);
      } catch { setComments([]); }
      finally { setCommentsLoading(false); }
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const data = await API.commentOnPost(post._id, newComment.trim());
      const comment = data.comment || { text: newComment, userId: currentUser, createdAt: new Date().toISOString() };
      setComments(prev => [...prev, comment]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
    } catch { }
    finally { setSubmittingComment(false); }
  };

  const media = post.media || [];
  const currentMedia = media[mediaIndex];
  const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : '';

  return (
    <article
      className="post-card px-4 py-3 cursor-pointer animate-fade-in"
      onClick={() => navigate(`/post/${post._id}`)}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {(author.isSupa || post.isSupa) ? (
            <div className="supa-avatar-ring cursor-pointer hover:opacity-90 transition-opacity" style={{ width: 50, height: 50 }}>
              <Avatar user={author} size={44} />
            </div>
          ) : (
            <Avatar
              user={author}
              size={44}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="font-bold text-discord-text hover:underline cursor-pointer truncate"
                onClick={e => { e.stopPropagation(); navigate(`/profile/${author.username || post.username}`); }}
              >
                {author.name || author.username || post.username}
              </span>
              {(author.isVerified || post.isVerified) && (
                <span className="supa-verified-tick" title="Verified">
                  <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{width:9,height:9,stroke:'white',strokeWidth:2.5,fill:'none'}}>
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                </span>
              )}
              {(author.isSupa || post.isSupa) && (
                <span className="supa-badge">SUPA</span>
              )}
              <span
                className="text-discord-muted text-sm truncate cursor-pointer hover:underline"
                onClick={e => { e.stopPropagation(); navigate(`/profile/${author.username || post.username}`); }}
              >
                @{author.username || post.username}
              </span>
              <span className="text-discord-muted text-sm">·</span>
              <span className="text-discord-muted text-sm flex-shrink-0">{timeAgo}</span>
            </div>
            <button
              className="p-1 rounded text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors"
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <FiMoreHorizontal size={18} />
            </button>
          </div>

          {post.caption && (
            <div className="text-discord-text text-sm mb-2 whitespace-pre-wrap break-words">
              <FormattedText text={post.caption} />
            </div>
          )}

          {post.caption && <LinkPreview text={post.caption} />}

          {media.length > 0 && (
            <div className="mt-2 mb-2 rounded-xl overflow-hidden bg-discord-dark">
              {currentMedia?.type === 'video' ? (
                <video
                  src={API.getMediaUrl(currentMedia.url)}
                  controls
                  playsInline
                  className="w-full max-h-96 object-contain"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <img
                  src={API.getMediaUrl(currentMedia?.url)}
                  alt="Post media"
                  className="w-full max-h-96 object-cover"
                  loading="lazy"
                  onClick={e => e.stopPropagation()}
                />
              )}
              {media.length > 1 && (
                <div className="flex gap-1 p-2 bg-discord-dark">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${i === mediaIndex ? 'bg-discord-brand' : 'bg-discord-muted'}`}
                      onClick={e => { e.stopPropagation(); setMediaIndex(i); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {post.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {post.hashtags.map(tag => (
                <span
                  key={tag}
                  className="text-discord-brand text-xs hover:underline cursor-pointer"
                  onClick={e => { e.stopPropagation(); navigate(`/search?tag=${tag}`); }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 mt-1">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:bg-red-500/10 ${liked ? 'text-red-400' : 'text-discord-muted hover:text-red-400'}`}
              onClick={handleLike}
            >
              {liked ? <HiHeart size={18} /> : <FiHeart size={16} />}
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${showComments ? 'text-discord-brand bg-discord-brand/10' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
              onClick={toggleComments}
            >
              <FiMessageCircle size={16} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>

            <div className="relative">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${userReaction ? 'text-discord-brand bg-discord-brand/10' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
                onClick={e => { e.stopPropagation(); setShowReactions(!showReactions); }}
              >
                {userReaction || '😊'} {userReaction && 'Reacted'}
              </button>
              {showReactions && (
                <div
                  className="absolute bottom-full left-0 mb-1 bg-discord-dark border border-discord-hover rounded-xl p-2 flex gap-1 z-30 shadow-xl"
                  onClick={e => e.stopPropagation()}
                >
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      className={`text-xl p-1.5 rounded-lg hover:bg-discord-hover transition-all hover:scale-125 ${userReaction === emoji ? 'bg-discord-hover' : ''}`}
                      onClick={e => handleReact(e, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${bookmarked ? 'text-discord-brand' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
              onClick={handleBookmark}
            >
              <FiBookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {showComments && (
            <div className="mt-3 border-t border-discord-hover/60 pt-3" onClick={e => e.stopPropagation()}>
              {currentUser && (
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mb-3">
                  <Avatar user={currentUser} size={30} />
                  <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-full px-3.5 py-1.5 focus-within:border-discord-brand/50 transition-colors">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-transparent text-discord-text text-sm outline-none placeholder-discord-muted"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleCommentSubmit(e); }}
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      className="text-discord-brand disabled:opacity-30 transition-opacity hover:opacity-80"
                    >
                      <FiSend size={14} />
                    </button>
                  </div>
                </form>
              )}

              {commentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-discord-muted text-xs text-center py-3">No replies yet. Be the first!</p>
              ) : (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {comments.map((c, i) => {
                    const cAuthor = c.userId || c.user || { username: c.username, profilePicture: c.userProfilePicture };
                    return (
                      <div key={c._id || i} className="flex gap-2.5 items-start">
                        <div
                          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={e => { e.stopPropagation(); navigate(`/profile/${cAuthor.username}`); }}
                        >
                          <Avatar user={cAuthor} size={30} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-white/5 border border-white/6 rounded-2xl rounded-tl-sm px-3 py-2">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span
                                className="font-semibold text-discord-text text-xs cursor-pointer hover:underline"
                                onClick={e => { e.stopPropagation(); navigate(`/profile/${cAuthor.username}`); }}
                              >
                                {cAuthor.name || cAuthor.username}
                              </span>
                              {cAuthor.isSupa && <span className="supa-badge" style={{fontSize:8,padding:'1px 5px'}}>SUPA</span>}
                              {cAuthor.isVerified && (
                                <span className="supa-verified-tick" title="Verified" style={{width:14,height:14}}>
                                  <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" style={{width:9,height:9,stroke:'white',strokeWidth:2.5,fill:'none'}}>
                                    <polyline points="2,6 5,9 10,3" />
                                  </svg>
                                </span>
                              )}
                            </div>
                            <p className="text-discord-text text-sm break-words leading-snug">{c.text || c.content}</p>
                          </div>
                          <span className="text-discord-muted text-[10px] ml-3 mt-0.5 block">
                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {commentCount > 3 && commentsLoaded && (
                <button
                  className="text-discord-brand text-xs mt-2 hover:underline flex items-center gap-1"
                  onClick={e => { e.stopPropagation(); navigate(`/post/${post._id}`); }}
                >
                  View all {commentCount} replies →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={e => { e.stopPropagation(); setShowMenu(false); }}
        >
          <div
            className="absolute right-4 bg-discord-dark border border-discord-hover rounded-lg shadow-xl py-1 min-w-40 z-50"
            style={{ top: '50%' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-text hover:bg-discord-hover transition-colors"
              onClick={handleShare}
            >
              <FiCopy size={14} /> Copy link
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-text hover:bg-discord-hover transition-colors"
              onClick={e => { e.stopPropagation(); setShowMenu(false); navigate(`/post/${post._id}`); }}
            >
              <FiExternalLink size={14} /> Open post
            </button>
            {isOwn && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
                onClick={handleDelete}
              >
                <FiTrash2 size={14} /> Delete post
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
