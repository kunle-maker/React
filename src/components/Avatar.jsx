import React from 'react';
import API from '../utils/api';

export default function Avatar({ user, size = 40, showStatus = false, className = '', supaRing = false }) {
  const src = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, size * 2) : null;
  const initials = (user?.name || user?.username || '?')[0].toUpperCase();

  const colors = ['#8b5cf6', '#10b981', '#faa61a', '#ed4245', '#3ba55c', '#00b0f4'];
  const colorIndex = (user?.username?.charCodeAt(0) || 0) % colors.length;
  const bgColor = colors[colorIndex];

  const showRing = supaRing && user?.isSupa;
  const innerSize = showRing ? Math.round(size * 0.84) : size;

  const statusColor = user?.isOnline ? '#10b981' : '#6b7280';
  const statusBorder = '#0d0f14';

  const imgEl = src ? (
    <img
      src={src}
      alt={`${user?.name || user?.username}'s avatar`}
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
      className="rounded-full flex items-center justify-center text-white font-bold select-none shadow-inner"
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
      className="absolute rounded-full border-2 shadow-sm"
      style={{
        width: size * 0.28,
        height: size * 0.28,
        bottom: showRing ? 1 : 0,
        right: showRing ? 1 : 0,
        backgroundColor: statusColor,
        borderColor: statusBorder,
        zIndex: 2
      }}
      aria-label={user?.isOnline ? 'Online' : 'Offline'}
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
            borderColor: statusBorder
          }}
          aria-label={user?.isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}
