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

function TwemojiIcon({ emoji, size = '1.4em', className = '' }) {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
  return (
    <img 
      src={`https://twemoji.maxcdn.com/v/latest/svg/${cp}.svg`} 
      alt={emoji} 
      style={{ width: size, height: size }}
      className={`select-none object-contain inline-block ${className}`}
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
  const [lastTap, setLastTap] = useState(0);

  // Custom Video States
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showVideoControl, setShowVideoControl] = useState(false);

  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments?.length || 0);

  const videoRef = useRef(null);
  const controlTimer = useRef(null);

  const author = post.userId || { username: post.username, profilePicture: post.userProfilePicture };
  const isOwn = currentUser && (author._id === currentUser._id || author.username === currentUser.username || post.username === currentUser.username);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          el.play().catch(() => {});
          setPlaying(true);
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: [0.2, 0.6] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mediaIndex]);

  const triggerBurst = (emoji) => {
    setBurst(emoji);
    setTimeout(() => setBurst(null), 800);
  };

  const handleLike = async (manual = true) => {
    if (manual && navigator.vibrate) navigator.vibrate(12);
    try {
      const prev = liked;
      if (!prev) triggerBurst('❤️');
      setLiked(!prev);
      setLikeCount(prev ? Math.max(0, likeCount - 1) : likeCount + 1);
      await API.likePost(post._id);
    } catch { 
      setLiked(liked); 
      setLikeCount(likeCount); 
    }
  };

  const handleMediaTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap -> Like
      if (!liked) handleLike(false);
      triggerBurst('❤️');
      setLastTap(0);
    } else {
      setLastTap(now);
      // Single tap -> Toggle Mute (Professional default)
      if (videoRef.current) {
        const newMuted = !muted;
        videoRef.current.muted = newMuted;
        setMuted(newMuted);
        
        setShowVideoControl(true);
        clearTimeout(controlTimer.current);
        controlTimer.current = setTimeout(() => setShowVideoControl(false), 1500);
      }
      
      // If it's a video, user might want to enter Reels mode
      if (post.media?.[mediaIndex]?.type === 'video' && onClickMedia) {
         // We allow a small delay to distinguish between mute and Reels navigation
         // But per request, let's make it intuitive: 
         // Most users tap media to view it. We'll use a specific "Expand" button or long press if needed,
         // but for now, let's stick to the requested onClickMedia trigger.
      }
    }
  };

  const media = post.media || [];
  const currentMedia = media[mediaIndex];
  const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : '';

  return (
    <article className="bg-discord-bg border-b border-discord-hover/30 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          <div 
            className={`p-[2px] rounded-full ${(author.isSupa || post.isSupa) ? 'bg-gradient-to-tr from-yellow-400 to-brand-primary' : 'border border-discord-hover'}`}
            onClick={() => navigate(`/profile/${author.username || post.username}`)}
          >
            <Avatar user={author} size={34} className="border-2 border-discord-bg cursor-pointer" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span 
                className="font-black text-[14px] text-discord-text hover:opacity-70 cursor-pointer"
                onClick={() => navigate(`/profile/${author.username || post.username}`)}
              >
                {author.username || post.username}
              </span>
              {(author.isVerified || post.isVerified) && <VerifiedBadge size={14} />}
              {(author.isSupa || post.isSupa) && <SupaBadge size={12} />}
            </div>
            {post.location && <span className="text-[10px] text-discord-muted -mt-0.5">{post.location}</span>}
          </div>
        </div>
        <button 
          onClick={() => setShowMenu(true)}
          className="p-2 text-discord-muted hover:text-discord-text transition-colors"
        >
          <FiMoreHorizontal size={20} />
        </button>
      </div>

      {/* Media Content */}
      <div className="relative aspect-square w-full bg-black overflow-hidden" onClick={handleMediaTap}>
        {burst && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-ping-once">
            <TwemojiIcon emoji={burst} size="80px" className="drop-shadow-2xl" />
          </div>
        )}

        {currentMedia?.type === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={API.getMediaUrl(currentMedia.url)}
              playsInline
              muted={muted}
              loop
              className="w-full h-full object-cover"
            />
            {/* Custom Video Overlay */}
            <div className="absolute bottom-4 right-4 z-20">
               <div className={`p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-opacity duration-300 ${showVideoControl ? 'opacity-100' : 'opacity-0'}`}>
                  {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
               </div>
            </div>
            {/* Reels Navigation Trigger */}
            <button 
              onClick={(e) => { e.stopPropagation(); onClickMedia?.(post, mediaIndex); }}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 transition-transform"
            >
               <FiSend size={16} className="rotate-[-10deg]" />
            </button>
          </>
        ) : (
          <img
            src={API.getMediaUrl(currentMedia?.url)}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {media.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white z-20">
            {mediaIndex + 1}/{media.length}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleLike()}
            className={`transition-transform active:scale-125 ${liked ? 'text-red-500' : 'text-discord-text hover:text-discord-muted'}`}
          >
            {liked ? <HiHeart size={28} /> : <FiHeart size={26} strokeWidth={2} />}
          </button>
          <button 
            onClick={() => navigate(`/post/${post._id}`, { state: { post } })}
            className="text-discord-text hover:text-discord-muted transition-transform active:scale-110"
          >
            <FiMessageCircle size={26} strokeWidth={2} />
          </button>
          <button className="text-discord-text hover:text-discord-muted transition-transform active:scale-110">
            <FiShare2 size={24} strokeWidth={2} />
          </button>
        </div>
        
        {media.length > 1 && (
          <div className="flex gap-1">
            {media.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-brand-primary' : 'bg-discord-hover'}`} />
            ))}
          </div>
        )}

        <button 
          onClick={() => { setBookmarked(!bookmarked); API.bookmarkPost(post._id); }}
          className={`transition-transform active:scale-110 ${bookmarked ? 'text-discord-text' : 'text-discord-text hover:text-discord-muted'}`}
        >
          <FiBookmark size={25} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      </div>

      {/* Post Info */}
      <div className="px-4 space-y-1.5">
        {likeCount > 0 && (
          <p className="text-sm font-black text-discord-text">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}
        
        <div className="text-sm leading-snug">
          <span className="font-black text-discord-text mr-2 hover:opacity-70 cursor-pointer" onClick={() => navigate(`/profile/${author.username}`)}>
            {author.username}
          </span>
          <span className="text-discord-text whitespace-pre-wrap break-words">
            <FormattedText text={post.caption || ''} />
          </span>
        </div>

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-x-2">
            {hashtags.map(tag => (
              <span key={tag} className="text-brand-primary text-xs font-bold">#{tag}</span>
            ))}
          </div>
        )}

        {commentCount > 0 && (
          <button 
            onClick={() => navigate(`/post/${post._id}`, { state: { post } })}
            className="text-discord-muted text-sm block hover:underline"
          >
            View all {commentCount} comments
          </button>
        )}

        <p className="text-[10px] text-discord-muted font-bold uppercase tracking-tight opacity-60">
          {timeAgo}
        </p>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setShowMenu(false)}>
           <div className="w-full max-w-lg bg-discord-sidebar rounded-t-3xl p-4 space-y-2 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1 bg-discord-hover rounded-full mx-auto mb-6" />
              <button onClick={() => { navigate(`/post/${post._id}`); setShowMenu(false); }} className="w-full py-4 text-left px-6 text-discord-text font-bold hover:bg-discord-hover rounded-2xl flex items-center gap-4">
                 <FiExternalLink size={20} /> Go to post
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/#/post/' + post._id); setShowMenu(false); }} className="w-full py-4 text-left px-6 text-discord-text font-bold hover:bg-discord-hover rounded-2xl flex items-center gap-4">
                 <FiCopy size={20} /> Copy link
              </button>
              {isOwn ? (
                <button onClick={handleDelete} className="w-full py-4 text-left px-6 text-red-400 font-bold hover:bg-red-400/10 rounded-2xl flex items-center gap-4">
                  <FiTrash2 size={20} /> Delete post
                </button>
              ) : (
                <button onClick={() => { setShowReport(true); setShowMenu(false); }} className="w-full py-4 text-left px-6 text-orange-400 font-bold hover:bg-orange-400/10 rounded-2xl flex items-center gap-4">
                  <FiFlag size={20} /> Report post
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full py-4 text-center text-discord-muted font-bold pt-4">Cancel</button>
           </div>
        </div>
      )}

      {showReport && (
        <ReportModal
          type="post"
          targetId={post._id}
          targetName={author.username}
          onClose={() => setShowReport(false)}
        />
      )}
    </article>
  );
}
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
