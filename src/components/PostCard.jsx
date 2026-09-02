import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiShare2, FiBookmark, FiMoreHorizontal, FiTrash2, FiCopy, FiExternalLink, FiSend, FiX, FiFlag, FiVolumeX, FiVolume2, FiDownload, FiMusic, FiEdit2, FiCheck, FiMapPin, FiEye, FiCornerDownRight, FiRepeat, FiBarChart2 } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { FaWhatsapp, FaFacebook, FaSnapchatGhost, FaTelegramPlane, FaSms } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';
import FormattedText from './FormattedText';
import LinkPreview from './LinkPreview';
import ReportModal from './ReportModal';
import { VerifiedBadge, SupaBadge } from './UserBadge';
import API from '../utils/api';
import { playVideo, pauseVideo } from '../utils/videoPlayer';
import { parseEmojisToHtml } from '../utils/emoji';
import { toast } from '../utils/toast';
import PollCard from './PollCard';

function TwemojiIcon({ emoji, size = '1.4em', className = '' }) {
  if (!emoji || typeof emoji !== 'string') return null;
  try {
    const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
    return (
      <img 
        src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${cp}.png`} 
        alt={emoji} 
        style={{ width: size, height: size }}
        className={`select-none object-contain inline-block ${className}`}
      />
    );
  } catch (e) { return null; }
}

const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👍'];
const COMMENT_REACTIONS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

export default function PostCard({ post, currentUser, onDelete, onUpdate, onClickMedia }) {
  if (!post) return null;
  const navigate = useNavigate();
  const [liked, setLiked] = useState(() => {
    if (post.isLiked !== undefined) return post.isLiked;
    if (currentUser && post.likes) {
      const myId = currentUser._id || currentUser.id;
      return Array.isArray(post.likes) && post.likes.some(l => (l?._id || l) === myId);
    }
    return false;
  });
  const [likeCount, setLikeCount] = useState(post.likeCount || post.likes?.length || 0);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction || null);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [interactedUsers, setInteractedUsers] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [commentLikesMap, setCommentLikesMap] = useState({});
  const [showPauseIndicator, setShowPauseIndicator] = useState(null);

  const media = post.media || [];
  const [mediaIndex, setMediaIndex] = useState(0);
  const currentMedia = media[mediaIndex];

  useEffect(() => {
    if (showShareSheet && interactedUsers.length === 0) {
      API.getConversations()
        .then(data => {
          const users = data.map(conv => conv.user).filter(Boolean);
          setInteractedUsers(users);
        })
        .catch(err => console.error('Failed to fetch interacted users', err));
    }
  }, [showShareSheet, interactedUsers.length]);

  const handleSendToUser = async (targetUser) => {
    try {
      const link = `${window.location.origin}/#/post/${post._id}`;
      await API.sendMessage({
        receiverUsername: targetUser.username,
        text: `Check out this post: ${link}`,
        type: 'text'
      });
      setShowShareSheet(false);
      toast.success(`Sent to ${targetUser.username}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    }
  };

  const shareText = `Check out this post on Vesselx! ${window.location.origin}/#/post/${post._id}`;
  const postUrl = `${window.location.origin}/#/post/${post._id}`;

  const trackShare = () => {
    API.sharePost?.(post._id).then(res => {
      if (res?.shareCount !== undefined) setShareCount(res.shareCount);
      else setShareCount(c => c + 1);
    }).catch(() => setShareCount(c => c + 1));
  };

  const handleSocialShare = (platform) => {
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent('Check out this post on Vesselx!')}`;
        break;
      case 'sms':
        url = `sms:?body=${encodeURIComponent(shareText)}`;
        break;
      default:
        break;
    }
    if (url) {
      trackShare();
      window.open(url, '_blank');
      setShowShareSheet(false);
    }
  };

  const handleDownload = async () => {
    if (!currentMedia) return;
    try {
      toast.info('Starting download...');
      const mediaUrl = API.getMediaUrl(currentMedia.url);
      const response = await fetch(mediaUrl);
      const blob = await response.blob();

      let downloadBlob = blob;
      const extension = currentMedia.type === 'video' ? 'mp4' : 'jpg';

      if (currentMedia.type !== 'video') {
        const imgBitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = imgBitmap.width;
        canvas.height = imgBitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgBitmap, 0, 0);

        const watermarkText = `@${username}`;
        const fontSize = Math.max(22, Math.round(imgBitmap.width * 0.048));
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        const padding = Math.round(fontSize * 0.75);
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = fontSize * 0.6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = 'white';
        ctx.fillText(watermarkText, padding, canvas.height - padding);

        downloadBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      }

      const blobUrl = window.URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `vesselx_${post._id}_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Downloaded successfully');
      setShowMenu(false);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed');
    }
  };

  const [burst, setBurst] = useState(null);
  const [lastTap, setLastTap] = useState(0);

  // Custom Video States
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showVideoControl, setShowVideoControl] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);

  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments?.length || 0);
  const [viewCount, setViewCount] = useState(post.viewCount || post.views || 0);
  const [shareCount, setShareCount] = useState(post.shareCount || post.shares || 0);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption || '');
  const [caption, setCaption] = useState(post.caption || '');
  const [isEdited, setIsEdited] = useState(post.isEdited || false);
  const viewTrackedRef = useRef(false);

  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [sheetComments, setSheetComments] = useState([]);
  const [loadingSheetComments, setLoadingSheetComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentInputRef = useRef(null);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const articleRef = useRef(null);
  const controlTimer = useRef(null);
  const slideshowRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const swipedRef = useRef(false);
  const tapTimeoutRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});

  const author = post.userId || { username: post.username || 'user', profilePicture: post.userProfilePicture };
  const username = author.username || post.username || 'user';
  const isOwn = currentUser && (author?._id === currentUser?._id || username === currentUser?.username);

  const isPhotoSlideshow = post.isPhotoSlideshow && post.soundUrl;
  const muteVideo = post.muteVideo && post.soundUrl;
  const isOriginalSound = post.isOriginalSound;
  const slideshowPhotos = isPhotoSlideshow ? media.filter(m => m.type === 'image') : [];
  const slideshowDuration = post.slideshowDuration || 10;

  useEffect(() => {
    const vel = videoRef.current;
    const ael = audioRef.current;

    const onVisible = () => {
      if (vel) {
        vel.muted = muteVideo ? true : muted;
        vel.play().catch(() => {});
        setPlaying(true);
      }
      if (ael) {
        ael.play().catch(() => {});
      }
    };

    const onHidden = () => {
      if (vel) { vel.pause(); setPlaying(false); }
      if (ael) { ael.pause(); }
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) onVisible();
        else onHidden();
      },
      { threshold: [0.2, 0.6] }
    );

    if (vel) {
      obs.observe(vel);
    } else if (articleRef.current) {
      obs.observe(articleRef.current);
    }

    return () => { obs.disconnect(); };
  }, [mediaIndex, post.soundUrl, muteVideo, isPhotoSlideshow]);

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

  const handleSwipeStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    swipedRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleSwipeMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 8 && Math.abs(dx) > dy) {
      setIsDragging(true);
      const multiPhoto = media.length > 1 || (isPhotoSlideshow && slideshowPhotos.length > 1);
      if (multiPhoto) {
        const activeCount = isPhotoSlideshow ? slideshowPhotos.length : media.length;
        const activeIndex = isPhotoSlideshow ? slideshowIndex : mediaIndex;
        if ((dx > 0 && activeIndex === 0) || (dx < 0 && activeIndex === activeCount - 1)) {
          setDragOffset(dx * 0.2);
        } else {
          setDragOffset(dx);
        }
      }
    }
  };

  const handleSwipeEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    setIsDragging(false);
    setDragOffset(0);
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      swipedRef.current = true;
      if (isPhotoSlideshow) {
        if (dx > 0 && slideshowIndex < slideshowPhotos.length - 1) setSlideshowIndex(i => i + 1);
        else if (dx < 0 && slideshowIndex > 0) setSlideshowIndex(i => i - 1);
      } else {
        if (dx > 0 && mediaIndex < media.length - 1) setMediaIndex(i => i + 1);
        else if (dx < 0 && mediaIndex > 0) setMediaIndex(i => i - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMediaTap = (e) => {
    if (swipedRef.current) { swipedRef.current = false; return; }
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      clearTimeout(tapTimeoutRef.current);
      if (!liked) handleLike(false);
      triggerBurst('❤️');
      setLastTap(0);
    } else {
      setLastTap(now);
      tapTimeoutRef.current = setTimeout(() => {
        const vel = videoRef.current;
        const ael = audioRef.current;
        const isPlaying = vel ? !vel.paused : (ael ? !ael.paused : false);
        if (isPlaying) {
          if (vel) vel.pause();
          if (ael) ael.pause();
          setPlaying(false);
          setShowPauseIndicator('pause');
        } else {
          if (vel) vel.play().catch(() => {});
          if (ael) ael.play().catch(() => {});
          setPlaying(true);
          setShowPauseIndicator('play');
        }
        setTimeout(() => setShowPauseIndicator(null), 700);
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await API.deletePost(post._id);
      onDelete?.(post._id);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : '';
  const hashtags = post.hashtags || (post.caption?.match(/#[a-z0-9_]+/gi) || []).map(t => t.slice(1));

  useEffect(() => {
    if (!articleRef.current || viewTrackedRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5 && !viewTrackedRef.current) {
        viewTrackedRef.current = true;
        API.viewPost?.(post._id).then(res => {
          if (res?.viewCount !== undefined) setViewCount(res.viewCount);
        }).catch(() => {});
        // Track impression for insights
        API.trackImpression?.(post._id).catch(() => {});
      }
    }, { threshold: 0.5 });
    obs.observe(articleRef.current);
    return () => obs.disconnect();
  }, [post._id]);

  const handleSaveCaption = async () => {
    if (!captionDraft.trim()) return;
    try {
      const mentions = [...captionDraft.matchAll(/@(\w+)/g)].map(m => m[1]);
      const data = await API.editPost(post._id, { caption: captionDraft, mentions });
      setCaption(captionDraft);
      setIsEdited(true);
      setEditingCaption(false);
      onUpdate?.({ ...post, caption: captionDraft, isEdited: true });
      toast.success('Caption updated');
    } catch { toast.error('Failed to update caption'); }
  };

  const loadComments = async () => {
    setLoadingSheetComments(true);
    try {
      const data = await API.getPostComments(post._id);
      setSheetComments(Array.isArray(data) ? data : data?.comments || []);
    } catch {}
    finally { setLoadingSheetComments(false); }
  };

  const openCommentSheet = () => {
    setShowCommentSheet(true);
    if (sheetComments.length === 0) loadComments();
    setTimeout(() => commentInputRef.current?.focus(), 400);
  };


  const handleCommentLike = async (commentId, currentLikes) => {
    const prev = commentLikesMap[commentId] || { liked: false, likeCount: currentLikes };
    const optimistic = { liked: !prev.liked, likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1 };
    setCommentLikesMap(m => ({ ...m, [commentId]: optimistic }));
    try {
      const data = await API.likeComment(post._id, commentId);
      setCommentLikesMap(m => ({ ...m, [commentId]: { liked: data.liked, likeCount: data.likeCount } }));
    } catch {
      setCommentLikesMap(m => ({ ...m, [commentId]: prev }));
    }
  };

  const handleComment = async (e) => {
    e?.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    const text = commentText.trim();
    setCommentText('');

    if (replyingTo) {
      const { commentId } = replyingTo;
      setReplyingTo(null);
      const optimisticReply = {
        _id: `optimistic-reply-${Date.now()}`,
        text,
        userId: currentUser,
        createdAt: new Date().toISOString(),
      };
      setSheetComments(prev => prev.map(c =>
        c._id === commentId
          ? { ...c, replies: [...(c.replies || []), optimisticReply] }
          : c
      ));
      try {
        const data = await API.replyToComment(post._id, commentId, text);
        const newReply = data && (data.reply || data.comment || (data._id ? data : null));
        if (newReply) {
          setSheetComments(prev => prev.map(c =>
            c._id === commentId
              ? {
                  ...c,
                  replies: (c.replies || []).map(r =>
                    r._id === optimisticReply._id
                      ? { ...newReply, userId: (newReply.userId && typeof newReply.userId === 'object') ? newReply.userId : currentUser }
                      : r
                  ),
                }
              : c
          ));
        }
      } catch { }
      finally { setSubmittingComment(false); }
      return;
    }

    const optimisticComment = {
      _id: `optimistic-${Date.now()}`,
      text,
      userId: currentUser,
      createdAt: new Date().toISOString(),
    };
    setSheetComments(prev => [...prev, optimisticComment]);
    setCommentCount(c => c + 1);
    try {
      const data = await API.commentOnPost(post._id, text);
      const savedComment = data.comment || data || null;
      if (savedComment) {
        const withUser = {
          ...savedComment,
          userId: (savedComment.userId && typeof savedComment.userId === 'object')
            ? savedComment.userId
            : currentUser,
        };
        setSheetComments(prev => prev.map(c => c._id === optimisticComment._id ? withUser : c));
      }
    } catch {
      setSheetComments(prev => prev.filter(c => c._id !== optimisticComment._id));
      setCommentCount(c => Math.max(0, c - 1));
    } finally { setSubmittingComment(false); }
  };

  return (
    <>
    <article ref={articleRef} className="bg-discord-bg border-b border-discord-hover/30 pb-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          <div
            className="cursor-pointer flex-shrink-0"
            onClick={() => navigate(`/profile/${author.username || post.username}`)}
          >
            <Avatar user={author} size={38} supaRing={true} className="cursor-pointer" />
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
        {post.soundUrl && (
          <div className="flex-1 px-2 min-w-0 flex justify-end">
            <div className="flex items-center gap-1.5 bg-discord-dark/50 px-2 py-1 rounded-full border border-discord-hover/50 max-w-fit">
              <FiMusic size={10} className="text-brand-primary animate-pulse flex-shrink-0" />
              <span className="text-[10px] font-bold text-discord-text truncate max-w-[80px]">
                {post.soundName}
              </span>
            </div>
          </div>
        )}
        <button 
          onClick={() => setShowMenu(true)}
          className="p-2 text-discord-muted hover:text-discord-text transition-colors"
        >
          <FiMoreHorizontal size={20} />
        </button>
      </div>

      {/* Media Content */}
      {post.isSupaOnly && !currentUser?.isSupa && !isOwn ? (
        <div className="relative aspect-square w-full bg-discord-dark flex flex-col items-center justify-center gap-2">
          <div className="absolute inset-0 bg-gradient-to-b from-discord-dark/60 to-discord-dark/90" />
          <span className="relative text-3xl">✦</span>
          <p className="relative text-white font-bold text-sm">Supa Members Only</p>
          <p className="relative text-white/50 text-xs">Upgrade to Supa to unlock this post</p>
        </div>
      ) : (
      <>
      {post.isSupaOnly && isOwn && (
        <div className="absolute top-2 right-2 z-10 bg-black/50 rounded-full px-2 py-0.5 flex items-center gap-1 text-yellow-400 text-[10px] font-bold backdrop-blur-sm">
          ✦ Supa only
        </div>
      )}
      {(() => {
        const photos = isPhotoSlideshow ? slideshowPhotos : media.filter(m => m.type === 'image');
        const activeIdx = isPhotoSlideshow ? slideshowIndex : mediaIndex;
        const setActiveIdx = isPhotoSlideshow ? setSlideshowIndex : setMediaIndex;
        const photoCount = isPhotoSlideshow ? slideshowPhotos.length : media.length;
        const isMulti = photoCount > 1;

        return (
          <div
            className="relative aspect-square w-full bg-black overflow-hidden"
            onClick={handleMediaTap}
            onTouchStart={handleSwipeStart}
            onTouchMove={handleSwipeMove}
            onTouchEnd={handleSwipeEnd}
          >
            {post.soundUrl && (
              <audio ref={audioRef} src={post.soundUrl} loop muted={muted} playsInline />
            )}
            {burst && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-ping-once">
                <TwemojiIcon emoji={burst} size="80px" className="drop-shadow-2xl" />
              </div>
            )}

            {/* Sliding strip for multi-photo posts */}
            {isMulti && !currentMedia?.type === 'video' || isMulti ? (
              <div
                className="absolute inset-0 flex"
                style={{
                  transform: `translateX(calc(${-activeIdx * (100 / photoCount)}% + ${dragOffset}px))`,
                  transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
                  width: `${photoCount * 100}%`,
                }}
              >
                {isPhotoSlideshow ? slideshowPhotos.map((photo, i) => {
                  const src = API.getMediaUrl(photo?.url);
                  const loaded = loadedImages[src];
                  return (
                    <div key={i} className="relative flex-shrink-0 h-full" style={{ width: `${100 / photoCount}%` }}>
                      {!loaded && (
                        <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                        </div>
                      )}
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                        onLoad={() => setLoadedImages(p => ({ ...p, [src]: true }))}
                      />
                    </div>
                  );
                }) : media.map((m, i) => {
                  if (m.type === 'video') {
                    return (
                      <div key={i} className="relative flex-shrink-0 h-full" style={{ width: `${100 / photoCount}%` }}>
                        <video
                          ref={i === activeIdx ? videoRef : null}
                          src={API.getMediaUrl(m.url)}
                          playsInline
                          muted={muteVideo ? true : muted}
                          loop
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  }
                  const src = API.getMediaUrl(m?.url);
                  const loaded = loadedImages[src];
                  return (
                    <div key={i} className="relative flex-shrink-0 h-full" style={{ width: `${100 / photoCount}%` }}>
                      {!loaded && (
                        <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                        </div>
                      )}
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                        onLoad={() => setLoadedImages(p => ({ ...p, [src]: true }))}
                      />
                    </div>
                  );
                })}
              </div>
            ) : currentMedia?.type === 'video' ? (
              <video
                ref={videoRef}
                src={API.getMediaUrl(currentMedia.url)}
                playsInline
                muted={muteVideo ? true : muted}
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              (() => {
                const src = API.getMediaUrl(currentMedia?.url);
                return (
                  <>
                    {!loadedImages[src] && (
                      <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                      </div>
                    )}
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                      onLoad={() => setLoadedImages(p => ({ ...p, [src]: true }))}
                    />
                  </>
                );
              })()
            )}

            {/* Pause / play indicator */}
            {showPauseIndicator && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center animate-ping-once">
                  {showPauseIndicator === 'pause'
                    ? <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                  }
                </div>
              </div>
            )}

            {/* Watermark overlay */}
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none select-none">
              <span
                className="text-white font-bold tracking-tight"
                style={{
                  fontSize: 'clamp(11px, 3.5vw, 15px)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0px 8px rgba(0,0,0,0.6)',
                  letterSpacing: '-0.01em',
                  opacity: 0.9,
                }}
              >
                @{username}
              </span>
            </div>

            {/* Mute button */}
            {(currentMedia?.type === 'video' || post.soundUrl) && !muteVideo && (
              <button
                className="absolute bottom-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white active:scale-90 transition-transform"
                onClick={e => {
                  e.stopPropagation();
                  const newMuted = !muted;
                  if (videoRef.current) videoRef.current.muted = newMuted;
                  if (audioRef.current) audioRef.current.muted = newMuted;
                  setMuted(newMuted);
                }}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}
              </button>
            )}

            {/* Photo counter & arrows */}
            {isMulti && (
              <>
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white z-20">
                  {activeIdx + 1}/{photoCount}
                </div>
                {activeIdx > 0 && (
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 active:scale-95 transition-all"
                    onClick={e => { e.stopPropagation(); setActiveIdx(i => i - 1); }}
                    aria-label="Previous"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                {activeIdx < photoCount - 1 && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 active:scale-95 transition-all"
                    onClick={e => { e.stopPropagation(); setActiveIdx(i => i + 1); }}
                    aria-label="Next"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
                {/* Dots at bottom */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                  {Array.from({ length: photoCount }).map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-200" style={{
                      width: i === activeIdx ? 14 : 6,
                      height: 6,
                      background: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                    }} />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}
      </>
      )}

      {/* Sound Label */}
      {post.soundName && (
        <div className="px-4 pt-2 pb-0">
          <div className="flex items-center gap-1.5">
            <FiMusic size={10} className="text-brand-primary animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-bold text-discord-muted truncate max-w-[200px]">
              {post.soundName}
            </span>
          </div>
        </div>
      )}

      {/* Poll */}
      {post.poll && (
        <PollCard poll={post.poll} postId={post._id} currentUser={currentUser} />
      )}

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
            onClick={openCommentSheet}
            className="text-discord-text hover:text-discord-muted transition-transform active:scale-110"
          >
            <FiMessageCircle size={26} strokeWidth={2} />
          </button>
          {/* Quote */}
          <button
            onClick={() => setShowQuoteModal(true)}
            className="text-discord-text hover:text-discord-brand transition-transform active:scale-110"
            title="Quote post"
          >
            <FiRepeat size={23} strokeWidth={2} />
          </button>
          <button 
            onClick={() => setShowShareSheet(true)}
            className="text-discord-text hover:text-discord-muted transition-transform active:scale-110"
          >
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

        <div className="flex items-center gap-2">
          {/* Save */}
          <button
            onClick={async () => {
              const next = !saved;
              setSaved(next);
              try { await API.savePost(post._id); }
              catch { setSaved(!next); }
            }}
            className={`transition-transform active:scale-110 ${saved ? 'text-yellow-400' : 'text-discord-text hover:text-yellow-400'}`}
            title={saved ? 'Saved' : 'Save post'}
          >
            <FiBookmark size={23} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
          {/* Bookmark (collection) */}
          <button 
            onClick={() => { setBookmarked(!bookmarked); API.bookmarkPost(post._id); }}
            className={`transition-transform active:scale-110 ${bookmarked ? 'text-discord-text' : 'text-discord-text hover:text-discord-muted'}`}
          >
            <FiBookmark size={25} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Quote modal */}
      {showQuoteModal && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowQuoteModal(false)}
        >
          <div
            className="w-full bg-discord-sidebar rounded-t-3xl p-5 space-y-4 sheet-slide-up"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-discord-hover rounded-full mx-auto" />
            <h3 className="font-bold text-discord-text text-base">Quote this post</h3>
            {/* Original post preview */}
            <div className="border border-discord-hover rounded-xl p-3 text-discord-muted text-sm">
              <span className="font-semibold text-discord-text">@{(post.userId?.username || post.username || '')}</span>
              {' '}{(post.caption || '').slice(0, 100)}{(post.caption?.length > 100 ? '…' : '')}
            </div>
            <textarea
              value={quoteText}
              onChange={e => setQuoteText(e.target.value)}
              placeholder="Add your thoughts…"
              rows={3}
              maxLength={500}
              className="w-full bg-discord-dark border border-discord-hover rounded-xl p-3 text-discord-text text-sm resize-none outline-none focus:border-discord-brand transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowQuoteModal(false); setQuoteText(''); }}
                className="flex-1 py-3 rounded-xl border border-discord-hover text-discord-muted font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                disabled={quoteSaving}
                onClick={async () => {
                  setQuoteSaving(true);
                  try {
                    await API.quotePost(post._id, quoteText.trim());
                    setShowQuoteModal(false);
                    setQuoteText('');
                    toast.success('Quoted!');
                  } catch (err) {
                    toast.error(err.message || 'Failed to quote');
                  } finally { setQuoteSaving(false); }
                }}
                className="flex-1 discord-btn py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {quoteSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiRepeat size={14} />}
                Quote
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Post Info */}
      <div className="px-4 space-y-1.5">
        {post.isPinned && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-discord-brand uppercase tracking-wider">
            <FiMapPin size={10} /> Pinned Post
          </div>
        )}
        {likeCount > 0 && (
          <p className="text-sm font-black text-discord-text">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}
        
        <div className="text-sm leading-snug">
          <span className="font-black text-discord-text mr-2 hover:opacity-70 cursor-pointer" onClick={() => navigate(`/profile/${author.username}`)}>
            {author.username}
          </span>
          {editingCaption ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                className="discord-input w-full resize-none text-sm"
                rows={3}
                maxLength={2200}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSaveCaption} className="discord-btn text-xs px-3 py-1 rounded-lg flex items-center gap-1"><FiCheck size={12} /> Save</button>
                <button onClick={() => { setEditingCaption(false); setCaptionDraft(caption); }} className="discord-btn-ghost text-xs px-3 py-1 rounded-lg border border-discord-hover">Cancel</button>
              </div>
            </div>
          ) : (
            <span className="text-discord-text whitespace-pre-wrap break-words">
              <FormattedText text={caption || ''} />
              {isEdited && <span className="text-[10px] text-discord-muted ml-1">(edited)</span>}
            </span>
          )}
        </div>

        {/* Quoted post preview */}
        {post.isQuotePost && post.quotedPost && (
          <div className="mt-2 mx-4 border border-discord-hover rounded-xl p-3 bg-discord-dark/50 cursor-pointer" onClick={() => navigate(`/post/${post.quotedPost._id}`)}>
            <div className="flex items-center gap-2 mb-1">
              <Avatar user={post.quotedPost.userId} size={18} />
              <span className="text-discord-muted text-xs font-semibold">@{post.quotedPost.userId?.username || 'user'}</span>
            </div>
            <p className="text-discord-text text-sm line-clamp-3">{post.quotedPost.caption || post.quoteComment}</p>
          </div>
        )}

        {hashtags.length > 0 && !editingCaption && (
          <div className="flex flex-wrap gap-x-2">
            {hashtags.map(tag => (
              <span key={tag} className="text-brand-primary text-xs font-bold">#{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <p className="text-[10px] text-discord-muted font-bold uppercase tracking-tight opacity-60">
            {timeAgo}
          </p>
          {viewCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-discord-muted opacity-60">
              <FiEye size={9} /> {viewCount.toLocaleString()}
            </span>
          )}
          {shareCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-discord-muted opacity-60">
              <FiShare2 size={9} /> {shareCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

    </article>

    {showMenu && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowMenu(false)}>
           <div className="w-full bg-discord-sidebar rounded-t-3xl p-3 space-y-1.5 sheet-slide-up" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-discord-hover rounded-full mx-auto mb-4" />
              <button onClick={() => { navigate(`/post/${post._id}`); setShowMenu(false); }} className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3">
                 <FiExternalLink size={16} /> Open post
              </button>
              <button onClick={() => { navigate(`/post/${post._id}/quotes`); setShowMenu(false); }} className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3">
                 <FiRepeat size={16} /> View quotes
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/#/post/' + post._id); setShowMenu(false); toast.success('Link copied!'); }} className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3">
                 <FiCopy size={16} /> Copy link
              </button>
              {currentMedia && (
                <button onClick={handleDownload} className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3">
                   <FiDownload size={16} /> Download {currentMedia.type === 'video' ? 'video' : 'image'}
                </button>
              )}
              {isOwn ? (
                <>
                  <button
                    onClick={async () => {
                      try {
                        await API.pinPost(post._id);
                        setShowMenu(false);
                        toast.success(post.isPinned ? 'Post unpinned' : 'Post pinned');
                        onUpdate?.({ ...post, isPinned: !post.isPinned });
                      } catch { toast.error('Failed to pin post'); }
                    }}
                    className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3"
                  >
                    <FiMapPin size={16} /> {post.isPinned ? 'Unpin post' : 'Pin post'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await API.toggleSupaOnly(post._id);
                        setShowMenu(false);
                        toast.success(post.isSupaOnly ? 'Supa-only removed' : 'Post set to Supa-only');
                        onUpdate?.({ ...post, isSupaOnly: !post.isSupaOnly });
                      } catch { toast.error('Failed to update'); }
                    }}
                    className="w-full py-2.5 text-left px-4 text-yellow-400 text-sm font-bold hover:bg-yellow-400/10 rounded-xl flex items-center gap-3"
                  >
                    ✦ {post.isSupaOnly ? 'Remove Supa-only' : 'Make Supa-only'}
                  </button>
                  <button onClick={handleDelete} className="w-full py-2.5 text-left px-4 text-red-400 text-sm font-bold hover:bg-red-400/10 rounded-xl flex items-center gap-3">
                    <FiTrash2 size={16} /> Delete post
                  </button>
                </>
              ) : (
                <button onClick={() => { setShowReport(true); setShowMenu(false); }} className="w-full py-2.5 text-left px-4 text-orange-400 text-sm font-bold hover:bg-orange-400/10 rounded-xl flex items-center gap-3">
                  <FiFlag size={16} /> Report post
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full py-2.5 text-center text-discord-muted text-sm font-bold mt-2">Cancel</button>
           </div>
        </div>
      , document.body)}

    {showShareSheet && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowShareSheet(false)}>
           <div className="w-full bg-discord-sidebar rounded-t-3xl p-6 space-y-6 sheet-slide-up" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
              <div className="w-12 h-1 bg-discord-hover rounded-full mx-auto" />
              
              <div className="flex flex-col gap-4">
                 <h3 className="text-discord-text font-black text-lg px-2">Send to</h3>
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
                    {interactedUsers.length > 0 ? (
                      interactedUsers.map(user => (
                        <div key={user._id} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer active:scale-95 transition-transform" onClick={() => handleSendToUser(user)}>
                           <Avatar user={user} size={50} />
                           <span className="text-[10px] text-discord-muted font-bold truncate w-full text-center">{user.username}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-discord-muted text-xs px-2">No recent interactions</p>
                    )}
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-discord-text font-black text-lg px-2">Share via</h3>
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide px-2">
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => { navigator.clipboard.writeText(window.location.origin + '/#/post/' + post._id); setShowShareSheet(false); toast.success('Link copied!'); }}>
                      <div className="w-14 h-14 rounded-full bg-discord-hover flex items-center justify-center text-discord-text">
                         <FiCopy size={24} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">Copy Link</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => handleSocialShare('whatsapp')}>
                      <div className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                         <FaWhatsapp size={28} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">WhatsApp</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => handleSocialShare('facebook')}>
                      <div className="w-14 h-14 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
                         <FaFacebook size={28} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">Facebook</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => setShowShareSheet(false)}>
                      <div className="w-14 h-14 rounded-full bg-[#FFFC00] flex items-center justify-center text-black">
                         <FaSnapchatGhost size={28} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">Snapchat</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => handleSocialShare('telegram')}>
                      <div className="w-14 h-14 rounded-full bg-[#0088cc] flex items-center justify-center text-white">
                         <FaTelegramPlane size={28} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">Telegram</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 cursor-pointer active:scale-90 transition-transform" onClick={() => handleSocialShare('sms')}>
                      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white">
                         <FaSms size={28} />
                      </div>
                      <span className="text-[10px] text-discord-muted font-bold">SMS</span>
                   </div>
                </div>
              </div>

              <button onClick={() => setShowShareSheet(false)} className="w-full py-4 text-center text-discord-muted font-bold pt-4 border-t border-discord-hover/30">Cancel</button>
           </div>
        </div>
      , document.body)}

    {showReport && (
      <ReportModal
        type="post"
        targetId={post._id}
        targetName={author.username}
        onClose={() => setShowReport(false)}
      />
    )}

    {showCommentSheet && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCommentSheet(false)}
        >
          <div
            className="w-full bg-discord-sidebar rounded-t-3xl flex flex-col sheet-slide-up"
            style={{ maxHeight: '92dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 border-b border-discord-hover/40">
              <div className="w-10 h-1 bg-discord-hover rounded-full mb-3" />
              <span className="text-discord-text font-black text-base tracking-tight">Comments</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingSheetComments ? (
                <div className="flex flex-col gap-3 p-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-discord-hover/40 flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 w-24 bg-discord-hover/40 rounded-full" />
                        <div className="h-2.5 w-48 bg-discord-hover/30 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sheetComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-discord-muted gap-3">
                  <FiMessageCircle size={36} className="opacity-30" />
                  <p className="text-sm font-bold opacity-50">No comments yet. Be the first!</p>
                </div>
              ) : (
                <div>
                  {sheetComments.map((c, i) => {
                    const cAuthor = c.userId || c.user || { username: c.username };
                    const cTime = c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : '';
                    const baseLikeCount = c.likeCount ?? c.likes?.length ?? 0;
                    const likeState = commentLikesMap[c._id] || { liked: false, likeCount: baseLikeCount };
                    const replies = c.replies || [];
                    return (
                      <div key={c._id || i} className="border-b border-discord-hover/30">
                        <div className="flex gap-3 px-4 py-3 hover:bg-discord-hover/10 transition-colors">
                          <div className="flex-shrink-0 cursor-pointer" onClick={() => { setShowCommentSheet(false); navigate(`/profile/${cAuthor.username}`); }}>
                            <Avatar user={cAuthor} size={36} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span
                                className="font-black text-discord-text text-sm cursor-pointer hover:opacity-70"
                                onClick={() => { setShowCommentSheet(false); navigate(`/profile/${cAuthor.username}`); }}
                              >
                                {cAuthor.username || cAuthor.name}
                              </span>
                              <span className="text-discord-muted text-[10px]">{cTime}</span>
                            </div>
                            <div className="text-discord-text text-sm whitespace-pre-wrap break-words leading-snug">
                              <FormattedText text={c.text || c.content || ''} />
                            </div>
                            <div className="flex items-center gap-4 mt-1.5">
                              <button
                                className="text-xs font-bold text-discord-muted hover:text-discord-text flex items-center gap-1 active:scale-95 transition-transform"
                                onClick={() => {
                                  setReplyingTo({ commentId: c._id, username: cAuthor.username });
                                  setTimeout(() => commentInputRef.current?.focus(), 100);
                                }}
                              >
                                <FiCornerDownRight size={11} /> Reply
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <button
                              className={`transition-colors active:scale-90 ${likeState.liked ? 'text-red-400' : 'text-discord-muted hover:text-red-400'}`}
                              onClick={() => handleCommentLike(c._id, baseLikeCount)}
                            >
                              {likeState.liked
                                ? <FiHeart size={14} className="fill-current" />
                                : <FiHeart size={14} />
                              }
                            </button>
                            {likeState.likeCount > 0 && <span className="text-[10px] text-discord-muted">{likeState.likeCount.toLocaleString()}</span>}
                          </div>
                        </div>
                        {replies.length > 0 && (
                          <div className="ml-14 pr-4 pb-3 space-y-2.5">
                            {replies.map((r, ri) => {
                              const rAuthor = r.userId && typeof r.userId === 'object' ? r.userId : { username: r.username, profilePicture: r.userProfilePicture };
                              return (
                                <div key={r._id || ri} className="flex gap-2.5 items-start">
                                  <div className="flex-shrink-0 cursor-pointer" onClick={() => { setShowCommentSheet(false); navigate(`/profile/${rAuthor.username}`); }}>
                                    <Avatar user={rAuthor} size={26} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                      <span className="font-black text-discord-text text-xs cursor-pointer hover:opacity-70" onClick={() => { setShowCommentSheet(false); navigate(`/profile/${rAuthor.username}`); }}>
                                        {rAuthor.username}
                                      </span>
                                      {r.createdAt && <span className="text-discord-muted text-[10px]">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>}
                                    </div>
                                    <div className="text-discord-text text-xs whitespace-pre-wrap break-words leading-snug">
                                      <FormattedText text={r.text || ''} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pb-4" />
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-discord-hover/40">
              <div className="flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
                {COMMENT_REACTIONS.map(r => (
                  <button
                    key={r}
                    className="text-2xl flex-shrink-0 hover:scale-125 active:scale-90 transition-transform"
                    onClick={() => setCommentText(t => t + r)}
                  >
                    <TwemojiIcon emoji={r} size="26px" />
                  </button>
                ))}
              </div>
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-1.5 bg-discord-hover/20 border-t border-discord-hover/30">
                  <span className="text-xs text-discord-muted">
                    Replying to <span className="font-bold text-discord-brand">@{replyingTo.username}</span>
                  </span>
                  <button className="text-discord-muted hover:text-discord-text p-0.5" onClick={() => setReplyingTo(null)}>
                    <FiX size={13} />
                  </button>
                </div>
              )}
              <form onSubmit={handleComment} className="flex items-center gap-3 px-4 pb-6 pt-2">
                <Avatar user={currentUser} size={32} />
                <div className="flex-1 flex items-center bg-discord-hover/30 rounded-full px-4 py-2.5 gap-2">
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Join the conversation...'}
                    className="flex-1 bg-transparent text-discord-text text-sm outline-none placeholder-discord-muted"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment(e)}
                  />
                  {commentText.trim() && (
                    <button
                      type="submit"
                      disabled={submittingComment}
                      className="text-brand-primary font-black text-sm disabled:opacity-40 flex-shrink-0"
                    >
                      {submittingComment ? '...' : 'Post'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
