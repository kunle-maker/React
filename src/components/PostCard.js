import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiHeart, FiMessageCircle, FiSend, FiBookmark,
  FiMoreVertical, FiTrash2, FiEye, FiPlay, FiPause,
  FiVolumeX, FiVolume2
} from 'react-icons/fi';
import { FaHeart, FaBookmark } from 'react-icons/fa';
import './PostCard.css';

const PostCard = ({ post, currentUser, onLike, onComment, onBookmark, onDelete, onPostClick, onDoubleTapLike }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(
    post.likes?.includes(currentUser?._id) || 
    post.likes?.includes(currentUser?.id) || 
    post.isLiked ||
    false
  );
  const [isBookmarked, setIsBookmarked] = useState(post.bookmarked || false);
  const [showOptions, setShowOptions] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  
  const videoRef = useRef(null);
  const lastTap = useRef(0);
  const progressInterval = useRef(null);
  const navigate = useNavigate();

  const postUser = post.userId || post.user || post.author || post.owner || {
    username: 'user',
    name: 'VesselX User',
    profilePicture: `https://ui-avatars.com/api/?name=User&background=random`
  };

  useEffect(() => {
    // Debug video loading
    if (post.media && post.media[currentMediaIndex]?.type === 'video') {
      const videoUrl = post.media[currentMediaIndex].url;
      console.log('Loading video:', videoUrl);
      
      // Test if video is accessible
      fetch(videoUrl, { method: 'HEAD' })
        .then(response => {
          console.log('Video status:', response.status, response.ok);
        })
        .catch(error => {
          console.error('Video fetch error:', error);
        });
    }
  }, [currentMediaIndex, post.media]);

  useEffect(() => {
    // Setup video observer for autoplay
    if (post.media?.[currentMediaIndex]?.type === 'video') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (videoRef.current) {
              if (entry.isIntersecting) {
                // Small delay to ensure video is ready
                setTimeout(() => {
                  if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.play()
                      .then(() => {
                        setIsPlaying(true);
                        setIsVideoLoading(false);
                      })
                      .catch(e => {
                        console.log("Autoplay prevented:", e);
                        setIsPlaying(false);
                        setIsVideoLoading(false);
                      });
                  }
                }, 100);
              } else {
                if (videoRef.current) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                if (progressInterval.current) {
                  clearInterval(progressInterval.current);
                }
              }
            }
          });
        },
        { threshold: 0.5 }
      );

      if (videoRef.current) {
        observer.observe(videoRef.current);
      }

      return () => {
        if (videoRef.current) {
          observer.unobserve(videoRef.current);
        }
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [currentMediaIndex, post.media]);

  const getProfilePicture = () => {
    if (!postUser.profilePicture || postUser.profilePicture === '/default-avatar.png') {
      return `https://ui-avatars.com/api/?name=${postUser.name || postUser.username}&background=random`;
    }
    
    if (postUser.profilePicture.startsWith('http')) {
      return postUser.profilePicture;
    }
    
    return `https://vesselx.onrender.com/api/media/${postUser.profilePicture}`;
  };

  const handleLike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      await onLike(post._id);
      if (!wasLiked) {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap.current;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      if (!isLiked) {
        handleLike(e);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
    }
    
    lastTap.current = currentTime;
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      setIsBookmarked(!isBookmarked);
      await onBookmark(post._id);
    } catch (error) {
      setIsBookmarked(isBookmarked); // Rollback
      console.error('Error bookmarking post:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.stopPropagation();
    if (!commentText.trim()) return;

    try {
      await onComment(post._id, commentText);
      setCommentText('');
      setShowComments(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeletePost = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await onDelete(post._id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handlePostClick = (e) => {
    e.stopPropagation();
    if (onPostClick) {
      onPostClick(post);
    }
  };

  const togglePlayPause = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        setIsVideoLoading(true);
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsVideoLoading(false);
          })
          .catch(e => {
            console.error('Play error:', e);
            setIsVideoLoading(false);
          });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    togglePlayPause(e);
  };

  const handleVideoProgress = () => {
    if (videoRef.current && videoRef.current.duration) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      console.log('Video metadata loaded, duration:', videoRef.current.duration);
    }
  };

const handleVideoError = (e) => {
  console.error('Video error:', e.target.error);
  setVideoError(e.target.error?.message || 'Failed to load video');
  setIsVideoLoading(false);
  if (videoRef.current) {
    videoRef.current.muted = true;
    videoRef.current.load();
    setTimeout(() => {
      if (videoRef.current && videoRef.current.error) {
        console.log('Video still failing, showing fallback');
        setVideoError('Video format not supported');
      }
    }, 1000);
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

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatVideoTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    navigate(`/post/${post._id}`);
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const isOwnPost = currentUser && (currentUser._id === postUser._id || currentUser.id === postUser.id);

  return (
    <article className="post-card" onClick={handlePostClick} onDoubleClick={handleDoubleTap}>
      <header style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={(e) => e.stopPropagation()}>
            <a href={`/profile/${postUser.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <img
                src={getProfilePicture()}
                alt={postUser.username}
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  cursor: 'pointer'
                }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${postUser.username}&background=random`;
                }}
              />
            </a>
          </div>
          <div>
            <a 
              href={`/profile/${postUser.username}`} 
              style={{ 
                textDecoration: 'none', 
                color: 'inherit',
                cursor: 'pointer'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                {postUser.username}
              </div>
            </a>
            {postUser.name && postUser.name !== postUser.username && (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {postUser.name}
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {post.createdAt ? formatTime(post.createdAt) : 'Just now'}
              {post.location && ` • ${post.location}`}
            </div>
          </div>
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            onClick={handleOptionsClick}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-dim)', 
              cursor: 'pointer',
              padding: '4px'
            }}
            title="More options"
          >
            <FiMoreVertical size={20} />
          </button>
          
          {showOptions && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              minWidth: '160px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePostClick(e);
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px'
                }}
              >
                <FiEye size={16} /> View Post
              </button>
              
              {isOwnPost && (
                <>
                  <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
                  <button 
                    onClick={handleDeletePost}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#ed4956',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '14px'
                    }}
                  >
                    <FiTrash2 size={16} /> Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {post.caption && (
        <div style={{ 
          padding: '0 16px 12px',
          cursor: 'text'
        }} onClick={(e) => e.stopPropagation()}>
          <p style={{ 
            fontSize: '15px', 
            lineHeight: '1.5', 
            color: 'var(--text-primary)',
            margin: 0
          }}>
            {post.caption}
          </p>
        </div>
      )}

      {post.media && post.media.length > 0 && (
        <div style={{ 
          width: '100%', 
          maxHeight: '600px', 
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
          background: '#000'
        }} onDoubleClick={handleDoubleTap}>
          {post.media[currentMediaIndex].type === 'video' ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <video 
                ref={videoRef}
                src={post.media[currentMediaIndex].url} 
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  display: 'block',
                  maxHeight: '600px',
                  objectFit: 'contain',
                  background: '#000'
                }}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                onClick={handleVideoClick}
                onTimeUpdate={handleVideoProgress}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onError={handleVideoError}
                onWaiting={() => setIsVideoLoading(true)}
                onCanPlay={() => setIsVideoLoading(false)}
              />
              
              {isVideoLoading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  fontSize: '24px'
                }}>
                  <div className="loading-spinner"></div>
                </div>
              )}
              
              {videoError && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  Failed to load video
                </div>
              )}
              
              {/* Mute/Unmute overlay */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5
                }}
                onClick={toggleMute}
              >
                {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
              </div>
              
              {/* Play/Pause overlay */}
              {!isPlaying && !isVideoLoading && !videoError && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 5
                  }}
                  onClick={handleVideoClick}
                >
                  <FiPlay size={24} />
                </div>
              )}
              
              {/* Progress bar */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  if (videoRef.current && videoRef.current.duration) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    videoRef.current.currentTime = percent * videoRef.current.duration;
                  }
                }}
              >
                <div 
                  style={{
                    height: '100%',
                    background: '#e1306c',
                    width: `${videoProgress}%`,
                    transition: 'width 0.1s linear'
                  }}
                />
              </div>
            </div>
          ) : (
            <img 
              src={post.media[currentMediaIndex].url} 
              alt="Post" 
              style={{ 
                width: '100%', 
                height: 'auto',
                display: 'block',
                maxHeight: '600px',
                objectFit: 'contain',
                background: '#000'
              }}
              onError={(e) => {
                console.error('Image error:', e.target.src);
                e.target.src = 'https://via.placeholder.com/500x500?text=Image+Not+Found';
              }}
            />
          )}
          
          {/* Media indicators for carousel */}
          {post.media.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '6px',
              zIndex: 5
            }}>
              {post.media.map((_, index) => (
                <div 
                  key={index}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: index === currentMediaIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Pause video if switching away from it
                    if (post.media[currentMediaIndex].type === 'video' && videoRef.current) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                    setCurrentMediaIndex(index);
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Heart animation for double-tap */}
          {showHeart && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: '64px',
              animation: 'heartFade 0.8s ease-out',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <FaHeart />
            </div>
          )}
        </div>
      )}

      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        cursor: 'default'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={handleLike} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: isLiked ? '#ed4956' : 'var(--text-primary)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '4px'
            }}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            {isLiked ? <FaHeart size={24} /> : <FiHeart size={24} />}
            <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: '600' }}>
              {post.likesCount || post.likes?.length || 0}
            </span>
          </button>
          <button 
            onClick={handleCommentClick} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              padding: '4px'
            }}
            title="Comments"
          >
            <FiMessageCircle size={24} />
            <span style={{ marginLeft: '8px', fontSize: '14px', fontWeight: '600' }}>
              {post.commentsCount || post.comments?.length || 0}
            </span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const url = `${window.location.origin}/post/${post._id}`;
              navigator.clipboard.writeText(url).then(() => {
                alert('Link copied to clipboard!');
              }).catch(err => {
                console.error('Failed to copy link:', err);
              });
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-primary)', 
              cursor: 'pointer',
              padding: '4px'
            }}
            title="Share"
          >
            <FiSend size={24} />
          </button>
        </div>
        <button 
          onClick={handleBookmark} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: isBookmarked ? '#0095f6' : 'var(--text-primary)', 
            cursor: 'pointer',
            padding: '4px'
          }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {isBookmarked ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
        </button>
      </div>

      {/* Comments section */}
      {showComments && post.comments && post.comments.length > 0 && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid var(--border-color)', 
          maxHeight: '300px', 
          overflowY: 'auto',
          cursor: 'default'
        }} onClick={(e) => e.stopPropagation()}>
          {post.comments.map(comment => (
            <div key={comment._id || comment.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <a 
                  href={`/profile/${comment.user?.username}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: 'none' }}
                >
                  <img
                    src={comment.user?.profilePicture || `https://ui-avatars.com/api/?name=${comment.user?.username || 'User'}&background=random`}
                    alt={comment.user?.username}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      cursor: 'pointer'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/24?text=U';
                    }}
                  />
                </a>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <a 
                    href={`/profile/${comment.user?.username}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      textDecoration: 'none',
                      fontWeight: '600', 
                      fontSize: '13px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {comment.user?.username || 'User'}
                  </a>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {formatTime(comment.createdAt)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginLeft: '32px' }}>
                {comment.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment input */}
      {showComments && currentUser && (
        <form 
          onSubmit={handleCommentSubmit} 
          style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            gap: '8px',
            cursor: 'default'
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            disabled={!commentText.trim()}
            style={{
              padding: '8px 16px',
              background: commentText.trim() ? '#0095f6' : 'var(--bg-dark)',
              color: commentText.trim() ? 'white' : 'var(--text-dim)',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: commentText.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Post
          </button>
        </form>
      )}
    </article>
  );
};

export default PostCard;