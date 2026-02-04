import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';

const VideoPlayer = ({ src, postId, onDoubleClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressInterval = useRef(null);

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

  const handleProgressClick = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  const handleVideoClick = () => {
    if (onDoubleClick) {
      // Single click toggles play/pause
      togglePlay();
    }
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

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
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="post-video-container"
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
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
      />

      {showHeart && (
        <div className="heart-animation active">
          <FaHeart />
        </div>
      )}

      <div className="video-mute-overlay" onClick={toggleMute}>
        {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
      </div>

      <div 
        className="video-controls-overlay"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <div className="video-controls">
          <button className="video-control-btn" onClick={togglePlay}>
            {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
          </button>
          
          <div 
            className="video-progress-container"
            onClick={handleProgressClick}
          >
            <div 
              className="video-progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <span className="video-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <button className="video-control-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;