import React from 'react';
import API from '../utils/api';

export function getStoredProfileFrame(username) {
  return '';
}
export function setStoredProfileFrame(username, frameId) {}

export default function Avatar({ user, size = 40, showStatus = false, className = '', supaRing = false, ghostMode = false }) {
  const src = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, size * 2) : null;
  const initials = (user?.name || user?.username || '?')[0].toUpperCase();

  const colors = ['#8b5cf6', '#10b981', '#faa61a', '#ed4245', '#3ba55c', '#00b0f4'];
  const colorIndex = (user?.username?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];

  const showRing = supaRing && user?.isSupa;
  const frameId = user?.username ? getStoredProfileFrame(user.username) : '';
  const hasFrame = !!frameId;

  // Profile picture is full size; frame ring extends outside via a larger overlay
  const picSize = (showRing && !hasFrame) ? Math.round(size * 0.84) : size;

  // Frame ring is larger than the profile picture to wrap around it
  const frameSize = Math.round(size * 1.28);
  const frameOffset = -Math.round((frameSize - size) / 2);

  const statusColor = ghostMode ? '#9ca3af' : (user?.isOnline ? '#10b981' : '#6b7280');
  const statusBorder = '#0d0f14';

  const picEl = src ? (
    <img
      src={src}
      alt={`${user?.name || user?.username}'s avatar`}
      className="rounded-full object-cover"
      style={{ width: picSize, height: picSize, flexShrink: 0 }}
      onError={e => {
        e.target.style.display = 'none';
        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
      }}
    />
  ) : null;

  const fallbackEl = (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold select-none"
      style={{
        width: picSize,
        height: picSize,
        backgroundColor: bgColor,
        fontSize: picSize * 0.4,
        flexShrink: 0,
        display: src ? 'none' : 'flex'
      }}
    >
      {initials}
    </div>
  );

  const statusDot = showStatus ? (
    <span
      className="absolute rounded-full border-2 shadow-sm"
      style={{
        width: size * 0.28,
        height: size * 0.28,
        bottom: 0,
        right: 0,
        backgroundColor: statusColor,
        borderColor: statusBorder,
        zIndex: 3,
        opacity: ghostMode ? 0.6 : 1,
      }}
      aria-label={ghostMode ? 'Ghost mode active' : (user?.isOnline ? 'Online' : 'Offline')}
      title={ghostMode ? "Ghost mode — you're hidden from others" : undefined}
    />
  ) : null;

  if (showRing || hasFrame) {
    // When a frame is active, strip border classes from className — the frame provides the visual ring
    const outerClass = hasFrame
      ? className.split(' ').filter(c => !c.startsWith('border')).join(' ')
      : className;

    return (
      <div
        className={`${showRing && !hasFrame ? 'supa-avatar-ring' : ''} relative inline-flex items-center justify-center flex-shrink-0 ${outerClass}`}
        style={{ width: size, height: size, borderRadius: '50%' }}
      >
        {/* Profile picture — sits at full size, centered, clipped to circle */}
        <div className="relative flex items-center justify-center" style={{ zIndex: 1, width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
          {picEl}
          {fallbackEl}
        </div>

        {/* Frame ring — larger than the avatar, clipped to only show the outer ring */}
        {hasFrame && (
          <img
            src={`/frames/${frameId}.jpg`}
            alt="profile frame"
            className="pointer-events-none select-none"
            style={{
              position: 'absolute',
              width: frameSize,
              height: frameSize,
              top: frameOffset,
              left: frameOffset,
              borderRadius: '50%',
              objectFit: 'cover',
              zIndex: 2,
              WebkitMaskImage: `radial-gradient(circle at center, transparent ${Math.round((size / frameSize) * 50 - 2)}%, black ${Math.round((size / frameSize) * 50 + 3)}%)`,
              maskImage: `radial-gradient(circle at center, transparent ${Math.round((size / frameSize) * 50 - 2)}%, black ${Math.round((size / frameSize) * 50 + 3)}%)`,
            }}
            draggable={false}
          />
        )}
        {statusDot}
      </div>
    );
  }

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={`${user?.name || user?.username}'s avatar`}
          className="rounded-full object-cover w-full h-full shadow-sm"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className="rounded-full flex items-center justify-center text-white font-bold select-none shadow-inner"
        style={{
          width: size, height: size,
          backgroundColor: bgColor,
          fontSize: size * 0.4,
          display: src ? 'none' : 'flex'
        }}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: statusColor,
            borderColor: statusBorder,
            opacity: ghostMode ? 0.6 : 1,
          }}
          aria-label={ghostMode ? 'Ghost mode active' : (user?.isOnline ? 'Online' : 'Offline')}
          title={ghostMode ? "Ghost mode — you're hidden from others" : undefined}
        />
      )}
    </div>
  );
}
