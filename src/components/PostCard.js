import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiHeart, FiMessageCircle, FiSend, FiBookmark,
  FiMoreVertical, FiTrash2, FiEye, FiPlay, FiPause,
  FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiDownload
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
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastTap = useRef(0);
  const controlsTimeout = useRef(null);
  const navigate = useNavigate();

  const postUser = post.userId || post.user || post.author || post.owner || {
    username: 'user',
    name: 'VesselX User',
    profilePicture: `https://ui-avatars.com/api/?name=User&background=random`
  };

  // Video intersection observer for play/pause based on 80% visibility
  useEffect(() => {
    if (post.media?.[currentMediaIndex]?.type !== 'video') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.8);
          
          if (videoRef.current) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
              // Video is at least 80% visible - play it
              videoRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  setIsVideoLoading(false);
                  // Ensure other videos are paused
                  document.querySelectorAll('video').forEach(video => {
                    if (video !== videoRef.current && !video.paused) {
                      video.pause();
                      video.muted = true;
                    }
                  });
                })
                .catch(e => {
                  console.log("Autoplay prevented:", e);
                  setIsPlaying(false);
                });
            } else {
              // Video is less than 80% visible - pause it and mute
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.muted = true; // Ensure audio stops
                setIsMuted(true);
                setIsPlaying(false);
              }
            }
          }
        });
      },
      { 
        threshold: [0.8], // 80% visibility threshold
        rootMargin: '0px'
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, [currentMediaIndex, post.media]);

  // Global video playback manager to ensure only one video plays at a time
  useEffect(() => {
    if (post.media?.[currentMediaIndex]?.type !== 'video') return;

    // Function to handle video play events
    const handleVideoPlay = (e) => {
      // If this video is playing, pause all other videos
      if (e.target === videoRef.current) {
        document.querySelectorAll('video').forEach(video => {
          if (video !== videoRef.current && !video.paused) {
            video.pause();
            // Also mute the other video to ensure audio stops
            video.muted = true;
          }
        });
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('play', handleVideoPlay);
    }

    return () => {
      if (video) {
        video.removeEventListener('play', handleVideoPlay);
      }
    };
  }, [currentMediaIndex, post.media]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        setIsMuted(true);
        setIsPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle scroll stop to ensure proper video state
  useEffect(() => {
    let scrollTimeout;
    
    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Set new timeout to check visibility after scroll stops
      scrollTimeout = setTimeout(() => {
        if (videoRef.current) {
          const rect = videoRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const visibleHeight = Math.max(0, 
            Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0)
          );
          const visiblePercentage = rect.height > 0 ? visibleHeight / rect.height : 0;
          
          // If less than 80% visible after scroll stops, ensure it's paused and muted
          if (visiblePercentage < 0.8 && isPlaying) {
            videoRef.current.pause();
            videoRef.current.muted = true;
            setIsMuted(true);
            setIsPlaying(false);
          }
        }
      }, 150); // Wait 150ms after scroll stops
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [isPlaying]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls && !controlsLocked) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, controlsLocked]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  const handleDownloadMedia = async (e) => {
    e.stopPropagation();
    const media = post.media[currentMediaIndex];
    
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = media.type === 'video' ? `video_${post._id}.mp4` : `image_${post._id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading media:', error);
      alert('Failed to download media. Please try again.');
    }
  };

  const handlePostClick = (e) => {
    e.stopPropagation();
    if (onPostClick) {
      onPostClick(post);
    }
  };

  // Video Controls
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
            // Pause other videos
            document.querySelectorAll('video').forEach(video => {
              if (video !== videoRef.current && !video.paused) {
                video.pause();
                video.muted = true;
              }
            });
          })
          .catch(e => {
            console.error('Play error:', e);
            setIsVideoLoading(false);
          });
      }
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (videoRef.current && videoDuration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * videoDuration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    // Show controls and lock them temporarily
    setShowControls(true);
    setControlsLocked(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setControlsLocked(false);
      setShowControls(false);
    }, 5000);
  };

  const handleVideoProgress = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setVideoProgress(progress);
      }
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVolume(videoRef.current.volume);
      setIsMuted(videoRef.current.muted);
      console.log('Video metadata loaded, duration:', videoRef.current.duration);
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e.target.error);
    setVideoError(e.target.error?.message || 'Failed to load video');
    setIsVideoLoading(false);
  };

  const handleMouseEnter = () => {
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (!isFullscreen && !controlsLocked) {
      setShowControls(false);
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
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    navigate(`/post/${post._id}`, { state: { post } });
  };

  const handleOptionsClick = (e) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const isOwnPost = currentUser && (currentUser._id === postUser._id || currentUser.id === postUser.id);

  const [showFullText, setShowFullText] = useState(false);
  const TEXT_LIMIT = 150;

  const renderCaption = (text) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;

    const processText = (t) => {
      const parts = t.split(/((?:https?:\/\/[^\s]+)|(?:@[a-zA-Z0-9_]+))/g);
      return parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{part}</a>;
        }
        if (part.match(mentionRegex)) {
          const username = part.substring(1);
          return <a key={i} href={`/profile/${username}`} style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{part}</a>;
        }
        return part;
      });
    };

    if (text.length <= TEXT_LIMIT || showFullText) {
      return (
        <>
          {processText(text)}
          {text.length > TEXT_LIMIT && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFullText(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', marginLeft: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              Show less
            </button>
          )}
        </>
      );
    }

    return (
      <>
        {processText(text.substring(0, TEXT_LIMIT))}...
        <button 
          onClick={(e) => { e.stopPropagation(); setShowFullText(true); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', marginLeft: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
        >
          Read more
        </button>
      </>
    );
  };

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
              minWidth: '180px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(false);
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
              
              {post.media && post.media.length > 0 && (
                <button 
                  onClick={handleDownloadMedia}
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
                  <FiDownload size={16} /> Download {post.media[currentMediaIndex]?.type === 'video' ? 'Video' : 'Image'}
                </button>
              )}
              
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
            {renderCaption(post.caption)}
          </p>
        </div>
      )}

      {post.media && post.media.length > 0 && (
        <div 
          ref={containerRef}
          style={{ 
            width: '100%', 
            maxHeight: '600px', 
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            background: '#000'
          }} 
          onDoubleClick={handleDoubleTap}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
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
                volume={volume}
              />
              
              {isVideoLoading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  fontSize: '24px',
                  zIndex: 10
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
                  fontSize: '14px',
                  zIndex: 10
                }}>
                  Failed to load video
                </div>
              )}
              
              {/* Video Controls Overlay */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3) 100%)',
                  opacity: showControls ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: showControls ? 'auto' : 'none',
                  zIndex: 5
                }}
              >
                {/* Top Controls */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'white'
                }}>
                  {/* Left side - Currently playing indicator */}
                  <div style={{
                    background: 'rgba(0,0,0,0.6)',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {postUser.username}
                  </div>
                  
                  {/* Right side - Speed and Fullscreen */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSpeedMenu(!showSpeedMenu);
                        }}
                        style={{
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {playbackSpeed}x
                      </button>
                      
                      {showSpeedMenu && (
                        <div style={{
                          position: 'absolute',
                          top: '30px',
                          right: '0',
                          background: 'rgba(0,0,0,0.9)',
                          borderRadius: '8px',
                          padding: '4px 0',
                          zIndex: 20
                        }}>
                          {[0.5, 1, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => handleSpeedChange(speed)}
                              style={{
                                padding: '8px 16px',
                                width: '80px',
                                background: 'none',
                                border: 'none',
                                color: speed === playbackSpeed ? 'var(--primary)' : 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                textAlign: 'left'
                              }}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={toggleFullscreen}
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {isFullscreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
                    </button>
                  </div>
                </div>

                {/* Center Play/Pause Button */}
                <button
                  onClick={togglePlayPause}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    color: 'white',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {isPlaying ? <FiPause size={30} /> : <FiPlay size={30} />}
                </button>

                {/* Bottom Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {/* Progress Bar */}
                  <div 
                    style={{
                      width: '100%',
                      height: '4px',
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={handleSeek}
                  >
                    <div 
                      style={{
                        height: '100%',
                        background: 'var(--primary)',
                        width: `${videoProgress}%`,
                        borderRadius: '2px',
                        transition: 'width 0.1s linear'
                      }}
                    />
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${videoProgress}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '12px',
                        height: '12px',
                        background: 'var(--primary)',
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        opacity: showControls ? 1 : 0,
                        transition: 'opacity 0.2s'
                      }}
                    />
                  </div>

                  {/* Control Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={togglePlayPause}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
                      </button>
                      
                      {/* Volume Control */}
                      <div 
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        onMouseLeave={() => setShowVolumeSlider(false)}
                      >
                        <button
                          onClick={toggleMute}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          {isMuted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
                        </button>
                        
                        {showVolumeSlider && (
                          <div style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.8)',
                            padding: '8px',
                            borderRadius: '20px',
                            height: '80px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volume}
                              onChange={handleVolumeChange}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '80px',
                                height: '4px',
                                transform: 'rotate(-90deg) translateX(-30px)',
                                WebkitAppearance: 'none',
                                background: 'rgba(255,255,255,0.3)',
                                borderRadius: '2px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Time Display */}
                      <span style={{ fontSize: '12px' }}>
                        {formatVideoTime(currentTime)} / {formatVideoTime(videoDuration)}
                      </span>
                    </div>
                  </div>
                </div>
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
              gap: '8px',
              zIndex: 5
            }}>
              {post.media.map((_, index) => (
                <div 
                  key={index}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: index === currentMediaIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: index === currentMediaIndex ? 'scale(1.2)' : 'scale(1)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Pause video if switching away from it
                    if (post.media[currentMediaIndex].type === 'video' && videoRef.current) {
                      videoRef.current.pause();
                      videoRef.current.muted = true;
                      setIsMuted(true);
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
              fontSize: '80px',
              animation: 'heartFade 0.8s ease-out',
              pointerEvents: 'none',
              zIndex: 10,
              textShadow: '0 0 20px rgba(0,0,0,0.5)'
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
              padding: '4px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
              padding: '4px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
              padding: '4px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
            padding: '4px',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {isBookmarked ? <FaBookmark size={24} /> : <FiBookmark size={24} />}
        </button>
      </div>

      {/* Comments section */}
{showComments && post.comments && post.comments.length > 0 && (
  <div
    style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border-color)',
      maxHeight: '300px',
      overflowY: 'auto',
      cursor: 'default'
    }}
    onClick={(e) => e.stopPropagation()}
  >
    {post.comments.map(comment => {
      // Determine username and profile picture – handle both old and new comment formats
      const commentUsername = comment.username || comment.user?.username || 'User';
      const commentProfilePic = comment.userProfilePicture || comment.user?.profilePicture;

      return (
        <div key={comment._id || comment.id} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <a
              href={`/profile/${commentUsername}`}
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: 'none' }}
            >
              <img
                src={commentProfilePic || `https://ui-avatars.com/api/?name=${commentUsername}&background=random`}
                alt={commentUsername}
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
                href={`/profile/${commentUsername}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '13px',
                  color: 'var(--text-primary)'
                }}
              >
                {commentUsername}
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
      );
    })}
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