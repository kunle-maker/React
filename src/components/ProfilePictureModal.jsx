import React, { useEffect } from 'react';
import { FiX, FiShare2, FiCamera, FiLink, FiMessageSquare } from 'react-icons/fi';
import API from '../utils/api';

export default function ProfilePictureModal({ user, isOwnProfile, onClose, onChangePhoto, onMessage, onCopyLink }) {
  const avatarSrc = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, 600) : null;
  const animatedSrc = (user?.isSupa || user?.isVerified) && user?.animatedProfilePicture ? API.getMediaUrl(user.animatedProfilePicture) : null;
  const initials = (user?.name || user?.username || '?')[0].toUpperCase();
  const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4'];
  const bgColor = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/#/profile/${user?.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user?.name || user?.username} on VesselX`,
          text: `Check out @${user?.username} on VesselX`,
          url,
        });
      } catch { }
    } else {
      onCopyLink?.();
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#/profile/${user?.username}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    onCopyLink?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="w-full flex items-center justify-start px-4 pt-10 pb-4">
        <button
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          onClick={onClose}
        >
          <FiX size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-6" onClick={e => e.stopPropagation()}>
        <div className="relative flex items-center justify-center" style={{ maxWidth: 320, width: '100%' }}>
          {animatedSrc ? (
            <video
              src={animatedSrc}
              autoPlay
              loop
              muted
              playsInline
              className="rounded-full object-cover shadow-2xl"
              style={{ width: '100%', maxWidth: 300, height: 'auto', aspectRatio: '1', border: '3px solid rgba(255,255,255,0.12)' }}
            />
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user?.name || user?.username}
              className="rounded-full object-cover shadow-2xl"
              style={{ width: '100%', maxWidth: 300, height: 'auto', aspectRatio: '1', border: '3px solid rgba(255,255,255,0.12)' }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center text-white font-black shadow-2xl"
              style={{
                width: 280,
                height: 280,
                backgroundColor: bgColor,
                fontSize: 280 * 0.38,
                border: '3px solid rgba(255,255,255,0.12)'
              }}
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 pb-12" onClick={e => e.stopPropagation()}>
        <p className="text-center text-white font-bold text-lg mb-1">{user?.name || user?.username}</p>
        <p className="text-center text-white/50 text-sm mb-6">@{user?.username}</p>

        {isOwnProfile ? (
          <div className="flex flex-col gap-3">
            <button
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-95"
              style={{ background: 'rgba(88,101,242,1)' }}
              onClick={() => { onClose(); onChangePhoto?.(); }}
            >
              <FiCamera size={18} /> Change Profile Photo
            </button>
            <button
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
              onClick={handleShare}
            >
              <FiShare2 size={18} /> Share Profile
            </button>
          </div>
        ) : (
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 text-center">Share Profile</p>
            <div className="flex justify-center gap-5 flex-wrap">
              <ShareButton
                icon="📤"
                label="Share"
                onClick={handleShare}
              />
              <ShareButton
                icon={<FiLink size={22} className="text-white" />}
                label="Copy link"
                onClick={handleCopyLink}
              />
              {onMessage && (
                <ShareButton
                  icon={<FiMessageSquare size={22} className="text-white" />}
                  label="Message"
                  onClick={() => { onClose(); onMessage?.(); }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareButton({ icon, label, onClick }) {
  return (
    <button
      className="flex flex-col items-center gap-2 transition-all active:scale-90"
      onClick={onClick}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {typeof icon === 'string' ? icon : icon}
      </div>
      <span className="text-white/70 text-xs font-medium">{label}</span>
    </button>
  );
}
