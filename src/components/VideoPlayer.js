import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize, FiDownload } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';

const VideoPlayer = ({ src, postId, onDoubleClick, onDownload }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeout = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setIsMuted(newVolume === 0);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleProgressClick = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  const handleVideoClick = () => {
    // Show controls and lock them temporarily
    setShowControls(true);
    setControlsLocked(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setControlsLocked(false);
      setShowControls(false);
    }, 5000);
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

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

  useEffect(() => {
    const video = videoRef.current;
    
    const updateProgress = () => {
      if (video) {
        setCurrentTime(video.currentTime);
        setDuration(video.duration || 0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    if (video) {
      video.addEventListener('timeupdate', updateProgress);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
      });
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      if (video) {
        video.removeEventListener('timeupdate', updateProgress);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="post-video-container"
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (!controlsLocked) {
          setShowControls(false);
        }
      }}
      style={{ 
        position: 'relative',
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        width: '100%',
        aspectRatio: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className="post-video"
        playsInline
        loop
        muted={isMuted}
        onClick={handleVideoClick}
        onDoubleClick={handleDoubleClick}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '80vh',
          objectFit: 'contain',
          display: 'block'
        }}
      />

      {showHeart && (
        <div className="heart-animation active">
          <FaHeart />
        </div>
      )}

      {/* Video Controls Overlay */}
      <div 
        className="video-controls-overlay"
        style={{ 
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none'
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
          color: 'white',
          zIndex: 6
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            Video Player
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {onDownload && (
              <button
                onClick={onDownload}
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
                title="Download video"
              >
                <FiDownload size={16} />
              </button>
            )}
            
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
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
                <div className="speed-menu">
                  {[0.5, 1, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={speed === playbackSpeed ? 'active' : ''}
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
          onClick={togglePlay}
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
            cursor: 'pointer',
            zIndex: 6
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
          gap: '8px',
          zIndex: 6
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
            onClick={handleProgressClick}
          >
            <div 
              style={{
                height: '100%',
                background: 'var(--primary)',
                width: `${progressPercent}%`,
                borderRadius: '2px',
                transition: 'width 0.1s linear'
              }}
            />
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: `${progressPercent}%`,
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
                onClick={togglePlay}
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
                  <div className="volume-slider-vertical" style={{
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
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;