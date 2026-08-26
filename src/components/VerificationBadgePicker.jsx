import React from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import {
  VERIFIED_BADGE_STYLES, SUPA_BADGE_STYLES,
  getVerifiedBadgeStyle, getSupaBadgeStyle,
  getStoredVerifiedBadgeStyle, setStoredVerifiedBadgeStyle,
  getStoredSupaBadgeStyle, setStoredSupaBadgeStyle,
  VerifiedBadge, SupaBadge,
} from './UserBadge';

export { getSupaBadgeStyle, getStoredSupaBadgeStyle, setStoredSupaBadgeStyle } from './UserBadge';

export default function VerificationBadgePicker({ username, badgeType = 'supa', currentStyleId, onSelect, onClose }) {
  const isVerified = badgeType === 'verified';
  const styles = isVerified ? VERIFIED_BADGE_STYLES : SUPA_BADGE_STYLES;
  const defaultStyleId = isVerified ? 'blue' : 'red';
  const [selectedStyle, setSelectedStyle] = React.useState(currentStyleId || defaultStyleId);

  const previewStyle = (isVerified ? getVerifiedBadgeStyle : getSupaBadgeStyle)(selectedStyle);

  const handleConfirm = () => {
    if (isVerified) {
      setStoredVerifiedBadgeStyle(username, selectedStyle);
    } else {
      setStoredSupaBadgeStyle(username, selectedStyle);
    }
    onSelect(selectedStyle);
  };

  const title = isVerified ? 'Verification Badge Style' : 'SUPA Badge Style';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4" onClick={onClose}>
      <div
        className="bg-[#111318] border border-white/8 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
              {isVerified
                ? <VerifiedBadge size={28} username={username} />
                : <SupaBadge size={28} username={username} />
              }
            </div>
            <div>
              <h2 className="font-black text-discord-text text-lg leading-tight">{title}</h2>
              <p className="text-discord-muted text-xs mt-0.5">Choose your badge color</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Color picker — only for verified badge (supa uses supa.png) */}
          {isVerified ? (
            <div>
              <p className="text-discord-muted text-xs font-bold uppercase tracking-widest mb-3 px-1">Badge Color</p>
              <div className="grid grid-cols-4 gap-2.5">
                {styles.map(style => {
                  const isActive = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all border-2 ${
                        isActive
                          ? 'border-white/30 bg-white/8 scale-105'
                          : 'border-transparent bg-white/3 hover:bg-white/6'
                      }`}
                      style={isActive ? { boxShadow: `0 0 14px ${style.glow}` } : {}}
                    >
                      {/* Preview using actual VerifiedBadge with this style temporarily */}
                      <svg width={34} height={34} viewBox="0 0 32 32" fill="none" style={{ filter: `drop-shadow(0 0 3px ${style.glow})` }}>
                        <circle cx="16" cy="16" r="15" fill={style.color} />
                        <circle cx="16" cy="16" r="12.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" fill="none" />
                        <polyline points="8,16 12,20.5 23.5,10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                      <span className="text-[10px] text-discord-muted font-semibold leading-tight text-center">{style.label}</span>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <FiCheck size={9} className="text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <img
                src="/stickers/CAACAgUAAxUAAWqPCGg6LpBhzEzNjuIckSrpfNkOAAJeCQAC7TPZVcm8pnn2jE5GPQQ/supa.png"
                alt="Supa Badge"
                className="w-20 h-20 object-contain"
                style={{ filter: `drop-shadow(0 0 8px ${previewStyle.glow})` }}
              />
              <p className="text-discord-muted text-sm text-center">Your Supa badge is your exclusive premium badge.</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/6 flex gap-3 flex-shrink-0 bg-[#0d0f14]">
          <button onClick={onClose} className="discord-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="discord-btn flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <FiCheck size={14} /> Apply Style
          </button>
        </div>
      </div>
    </div>
  );
}
