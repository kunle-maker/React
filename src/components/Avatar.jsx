import React from 'react';
import API from '../utils/api';

export default function Avatar({ user, size = 40, showStatus = false, className = '', supaRing = false }) {
  const src = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, size * 2) : null;
  const initials = (user?.name || user?.username || '?')[0].toUpperCase();

  const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4'];
  const colorIndex = (user?.username?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];

  const showRing = supaRing && user?.isSupa;
  const innerSize = showRing ? Math.round(size * 0.84) : size;

  const imgEl = src ? (
    <img
      src={src}
      alt={user?.name || user?.username}
      className="rounded-full object-cover"
      style={{ width: innerSize, height: innerSize }}
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
        width: innerSize,
        height: innerSize,
        backgroundColor: bgColor,
        fontSize: innerSize * 0.4,
        display: src ? 'none' : 'flex'
      }}
    >
      {initials}
    </div>
  );

  const statusDot = showStatus ? (
    <span
      className="absolute rounded-full border-2"
      style={{
        width: size * 0.28,
        height: size * 0.28,
        bottom: showRing ? 1 : 0,
        right: showRing ? 1 : 0,
        backgroundColor: user?.isOnline ? '#3ba55c' : '#72767d',
        borderColor: '#2f3136',
        zIndex: 2
      }}
    />
  ) : null;

  if (showRing) {
    return (
      <div
        className={`supa-avatar-ring relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: size, height: size, borderRadius: '50%' }}
      >
        <div className="relative flex items-center justify-center" style={{ zIndex: 1 }}>
          {imgEl}
          {fallbackEl}
        </div>
        {statusDot}
      </div>
    );
  }

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={user?.name || user?.username}
          className="rounded-full object-cover w-full h-full"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <div
        className="rounded-full flex items-center justify-center text-white font-bold select-none"
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
          className="absolute bottom-0 right-0 rounded-full border-2 border-discord-sidebar"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            backgroundColor: user?.isOnline ? '#3ba55c' : '#72767d',
            borderColor: '#2f3136'
          }}
        />
      )}
    </div>
  );
}
