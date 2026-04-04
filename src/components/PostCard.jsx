import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShare2, FiBookmark, FiMoreHorizontal, FiTrash2, FiCopy, FiExternalLink, FiSend, FiX, FiFlag } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';
import FormattedText from './FormattedText';
import LinkPreview from './LinkPreview';
import ReportModal from './ReportModal';
import { VerifiedBadge, SupaBadge } from './UserBadge';
import API from '../utils/api';
import { playVideo, pauseVideo } from '../utils/videoPlayer';
import { parseEmojisToHtml } from '../utils/emoji';

function TwemojiIcon({ emoji, size = '1.4em' }) {
  return (
    <span
      style={{ fontSize: size, lineHeight: 1 }}
      dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(emoji) }}
    />
  );
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👍'];

export default function PostCard({ post, currentUser, onDelete, onUpdate, onClickMedia }) {
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
  const [showReport, setShowReport] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [burst, setBurst] = useState(null);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments?.length || 0);

  const menuRef = useRef(null);
  const videoRef = useRef(null);

  const author = post.userId || { username: post.username };
  const isOwn = currentUser && (author._id === currentUser._id || author.username === currentUser.username || post.username === currentUser.username);

  useEffect(() => {
    if (post.isLiked === undefined && currentUser) {
      API.getPost(post._id).then(data => {
        const p = data.post || data;
        if (p.isLiked !== undefined) setLiked(p.isLiked);
        if (p.likeCount !== undefined) setLikeCount(p.likeCount);
        if (p.isBookmarked !== undefined) setBookmarked(p.isBookmarked);
        if (p.userReaction !== undefined) setUserReaction(p.userReaction);
      }).catch(() => {});
    }
  }, [post._id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.5) playVideo(el);
        else if (entry.intersectionRatio < 0.2) pauseVideo(el);
      },
      { threshold: [0.2, 0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mediaIndex]);

  const triggerBurst = (emoji) => {
    setBurst(emoji);
    setTimeout(() => setBurst(null), 600);
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    try {
      const prev = liked;
      if (!prev) triggerBurst('❤️');
      setLiked(!prev);
      setLikeCount(prev ? likeCount - 1 : likeCount + 1);
      await API.likePost(post._id);
    } catch { setLiked(liked); setLikeCount(likeCount); }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(8);
    try {
      setBookmarked(!bookmarked);
      await API.bookmarkPost(post._id);
    } catch { setBookmarked(bookmarked); }
  };

  const handleReact = async (e, emoji) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    setShowReactions(false);
    triggerBurst(emoji);
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
    if (navigator.vibrate) navigator.vibrate(5);
    setShowMenu(false);
    navigator.clipboard?.writeText(window.location.origin + `/#/post/${post._id}`);
  };

  const toggleComments = async (e) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(5);
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
    if (navigator.vibrate) navigator.vibrate(12);
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
      className="post-card px-4 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
      onClick={() => navigate(`/post/${post._id}`, { state: { post } })}
    >
      {burst && (
        <div className="reaction-burst left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <TwemojiIcon emoji={burst} size="3rem" />
        </div>
      )}
      
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {(author.isSupa || post.isSupa) ? (
            <div className="supa-avatar-ring supa-sparkle cursor-pointer hover:opacity-90 transition-all active:scale-95" style={{ width: 52, height: 52 }}>
              <Avatar user={author} size={46} />
            </div>
          ) : (
            <Avatar
              user={author}
              size={48}
              className="cursor-pointer hover:opacity-80 transition-all active:scale-95"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`font-bold text-discord-text hover:underline cursor-pointer truncate ${(author.isSupa || post.isSupa) ? 'supa-post-name' : ''}`}
                onClick={e => { e.stopPropagation(); navigate(`/profile/${author.username || post.username}`); }}
                dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(author.name || author.username || post.username || '') }}
              />
              {(author.isVerified || post.isVerified) && <VerifiedBadge size={15} />}
              {(author.isSupa || post.isSupa) && <SupaBadge size={14} username={author.username || post.username} />}
              <span
                className="text-discord-muted text-sm truncate cursor-pointer hover:underline opacity-60"
                onClick={e => { e.stopPropagation(); navigate(`/profile/${author.username || post.username}`); }}
              >
                @{author.username || post.username}
              </span>
              <span className="text-discord-muted/40 text-[10px]">•</span>
              <span className="text-discord-muted text-xs flex-shrink-0 opacity-70">{timeAgo}</span>
            </div>
            <button
              aria-label="More options"
              className="p-1.5 rounded-full text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors active:scale-90"
              onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <FiMoreHorizontal size={20} />
            </button>
          </div>

          {post.caption && (
            <div className="text-discord-text text-[15px] mb-3 whitespace-pre-wrap break-words leading-relaxed">
              <FormattedText text={post.caption} />
            </div>
          )}

          {post.caption && <LinkPreview text={post.caption} />}

          {media.length > 0 && (
            <div className="mt-2 mb-3 rounded-2xl overflow-hidden bg-discord-dark/50 border border-discord-hover/30 relative group">
              {currentMedia?.type === 'video' ? (
                <div 
                  className="relative cursor-pointer"
                  onClick={e => {
                    if (onClickMedia) {
                      e.stopPropagation();
                      onClickMedia(post, mediaIndex);
                    }
                  }}
                >
                  <video
                    ref={videoRef}
                    src={API.getMediaUrl(currentMedia.url)}
                    playsInline
                    muted
                    className="w-full max-h-[500px] object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20">
                       <FiSend size={24} className="text-white ml-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={API.getMediaUrl(currentMedia?.url)}
                  alt="Post media"
                  className="w-full max-h-[500px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                  onClick={e => {
                    if (onClickMedia) {
                      e.stopPropagation();
                      onClickMedia(post, mediaIndex);
                    }
                  }}
                />
              )}
              {media.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to media ${i+1}`}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-brand-primary w-4' : 'bg-white/40'}`}
                      onClick={e => { e.stopPropagation(); setMediaIndex(i); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {post.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.hashtags.map(tag => (
                <span
                  key={tag}
                  className="text-brand-primary text-sm font-semibold hover:underline cursor-pointer bg-brand-primary/10 px-2 py-0.5 rounded-md"
                  onClick={e => { e.stopPropagation(); navigate(`/search?tag=${tag}`); }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            <button
              aria-label={liked ? 'Unlike' : 'Like'}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-90 ${liked ? 'text-red-400 bg-red-400/10' : 'text-discord-muted hover:text-red-400 hover:bg-red-400/10'}`}
              onClick={handleLike}
            >
              {liked ? <HiHeart size={20} className="animate-pop" /> : <FiHeart size={18} />}
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            <button
              aria-label="View replies"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-90 ${showComments ? 'text-brand-primary bg-brand-primary/10' : 'text-discord-muted hover:text-brand-primary hover:bg-brand-primary/10'}`}
              onClick={toggleComments}
            >
              <FiMessageCircle size={18} />
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>

            <div className="relative">
              <button
                aria-label="React to post"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-90 ${userReaction ? 'text-brand-accent bg-brand-accent/10' : 'text-discord-muted hover:text-brand-accent hover:bg-brand-accent/10'}`}
                onClick={e => { e.stopPropagation(); setShowReactions(!showReactions); }}
              >
                <TwemojiIcon emoji={userReaction || '😊'} size="1.2em" />
              </button>
              {showReactions && (
                <div
                  className="absolute bottom-full left-0 mb-3 bg-discord-dark border border-discord-hover/50 rounded-2xl p-2 flex gap-1.5 z-30 shadow-2xl animate-slide-up glass-card"
                  onClick={e => e.stopPropagation()}
                >
                  {REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      aria-label={`React with ${emoji}`}
                      className={`p-2 rounded-xl hover:bg-white/10 transition-all hover:scale-125 active:scale-90 ${userReaction === emoji ? 'bg-white/10' : ''}`}
                      onClick={e => handleReact(e, emoji)}
                    >
                      <TwemojiIcon emoji={emoji} size="1.6em" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              aria-label={bookmarked ? 'Unbookmark' : 'Bookmark'}
              className={`ml-auto p-2.5 rounded-full text-sm transition-all active:scale-90 ${bookmarked ? 'text-brand-primary bg-brand-primary/10' : 'text-discord-muted hover:text-brand-primary hover:bg-brand-primary/10'}`}
              onClick={handleBookmark}
            >
              <FiBookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {showComments && (
            <div className="mt-4 border-t border-discord-hover/40 pt-4 animate-fade-in" onClick={e => e.stopPropagation()}>
              {currentUser && (
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-3 mb-4">
                  <Avatar user={currentUser} size={32} />
                  <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-brand-primary/50 focus-within:bg-white/[0.08] transition-all">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-transparent text-discord-text text-[14px] outline-none placeholder-discord-muted/60"
                    />
                    <button
                      type="submit"
                      aria-label="Post reply"
                      disabled={!newComment.trim() || submittingComment}
                      className="text-brand-primary disabled:opacity-30 transition-all hover:scale-110 active:scale-90"
                    >
                      <FiSend size={16} />
                    </button>
                  </div>
                </form>
              )}
...
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
                                dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(cAuthor.name || cAuthor.username || '') }}
                              />
                              {cAuthor.isSupa && <SupaBadge size={13} username={cAuthor.username} />}
                              {cAuthor.isVerified && <VerifiedBadge size={13} />}
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
                  onClick={e => { e.stopPropagation(); navigate(`/post/${post._id}`, { state: { post } }); }}
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
              onClick={e => { e.stopPropagation(); setShowMenu(false); navigate(`/post/${post._id}`, { state: { post } }); }}
            >
              <FiExternalLink size={14} /> Open post
            </button>
            {!isOwn && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
                onClick={e => { e.stopPropagation(); setShowMenu(false); setShowReport(true); }}
              >
                <FiFlag size={14} /> Report post
              </button>
            )}
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

      {showReport && (
        <ReportModal
          type="post"
          targetId={post._id}
          targetName={author.name || author.username}
          onClose={() => setShowReport(false)}
        />
      )}
    </article>
  );
}
