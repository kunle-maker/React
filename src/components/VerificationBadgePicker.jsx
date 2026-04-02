import React from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { VERIFIED_BADGE_STYLES, getStoredVerifiedBadgeStyle, setStoredVerifiedBadgeStyle } from './UserBadge';

export const SUPA_BADGE_STYLES = [
  { id: 'red',      label: 'Crimson',   color: '#E53935', glow: 'rgba(229,57,53,0.55)' },
  { id: 'blue',     label: 'Sapphire',  color: '#1D9BF0', glow: 'rgba(29,155,240,0.55)' },
  { id: 'gold',     label: 'Gold',      color: '#FFB300', glow: 'rgba(255,179,0,0.55)' },
  { id: 'purple',   label: 'Amethyst',  color: '#8E24AA', glow: 'rgba(142,36,170,0.55)' },
  { id: 'green',    label: 'Emerald',   color: '#00897B', glow: 'rgba(0,137,123,0.55)' },
  { id: 'orange',   label: 'Amber',     color: '#FB8C00', glow: 'rgba(251,140,0,0.55)' },
  { id: 'pink',     label: 'Rose',      color: '#E91E8C', glow: 'rgba(233,30,140,0.55)' },
  { id: 'cyan',     label: 'Aqua',      color: '#00ACC1', glow: 'rgba(0,172,193,0.55)' },
  { id: 'silver',   label: 'Silver',    color: '#90A4AE', glow: 'rgba(144,164,174,0.55)' },
  { id: 'teal',     label: 'Teal',      color: '#1ABC9C', glow: 'rgba(26,188,156,0.55)' },
  { id: 'lime',     label: 'Lime',      color: '#76FF03', glow: 'rgba(118,255,3,0.55)' },
  { id: 'indigo',   label: 'Indigo',    color: '#5865F2', glow: 'rgba(88,101,242,0.55)' },
  { id: 'coral',    label: 'Coral',     color: '#FF6B6B', glow: 'rgba(255,107,107,0.55)' },
  { id: 'mint',     label: 'Mint',      color: '#00E676', glow: 'rgba(0,230,118,0.55)' },
  { id: 'lavender', label: 'Lavender',  color: '#B39DDB', glow: 'rgba(179,157,219,0.55)' },
  { id: 'sky',      label: 'Sky',       color: '#29B6F6', glow: 'rgba(41,182,246,0.55)' },
  { id: 'bronze',   label: 'Bronze',    color: '#CD7F32', glow: 'rgba(205,127,50,0.55)' },
  { id: 'ruby',     label: 'Ruby',      color: '#FF1744', glow: 'rgba(255,23,68,0.55)' },
  { id: 'jade',     label: 'Jade',      color: '#00C853', glow: 'rgba(0,200,83,0.55)' },
  { id: 'magenta',  label: 'Magenta',   color: '#D500F9', glow: 'rgba(213,0,249,0.55)' },
  { id: 'navy',     label: 'Navy',      color: '#1A237E', glow: 'rgba(26,35,126,0.55)' },
  { id: 'peach',    label: 'Peach',     color: '#FFAB76', glow: 'rgba(255,171,118,0.55)' },
  { id: 'electric', label: 'Electric',  color: '#00E5FF', glow: 'rgba(0,229,255,0.55)' },
  { id: 'forest',   label: 'Forest',    color: '#2E7D32', glow: 'rgba(46,125,50,0.55)' },
];

export function getSupaBadgeStyle(styleId) {
  return SUPA_BADGE_STYLES.find(s => s.id === styleId) || SUPA_BADGE_STYLES[0];
}

export function getStoredSupaBadgeStyle(username) {
  try { return localStorage.getItem(`supaBadgeStyle_${username}`) || 'red'; } catch { return 'red'; }
}
export function setStoredSupaBadgeStyle(username, styleId) {
  try { localStorage.setItem(`supaBadgeStyle_${username}`, styleId); } catch {}
}

function MetaBadgePreview({ color, glow, size = 36, animate = false }) {
  const cx = 12, cy = 12, outerR = 11.5, innerR = 8.8, pts = 12;
  let path = '';
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI / pts) - Math.PI / 2;
    path += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(angle)).toFixed(2) + ',' + (cy + r * Math.sin(angle)).toFixed(2);
  }
  path += 'Z';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animate ? 'meta-badge-supa-anim' : ''}
      style={animate ? { filter: `drop-shadow(0 0 6px ${glow})` } : {}}
    >
      <path d={path} fill={color} />
      <polyline points="7.5,12 10.5,15 16.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function VerificationBadgePicker({ username, badgeType = 'supa', currentStyleId, onSelect, onClose }) {
  const styles = badgeType === 'verified' ? VERIFIED_BADGE_STYLES : SUPA_BADGE_STYLES;
  const defaultId = badgeType === 'verified' ? 'blue' : 'red';
  const [selected, setSelected] = React.useState(currentStyleId || defaultId);

  const handleConfirm = () => {
    if (badgeType === 'verified') {
      setStoredVerifiedBadgeStyle(username, selected);
    } else {
      setStoredSupaBadgeStyle(username, selected);
    }
    onSelect(selected);
  };

  const title = badgeType === 'verified' ? 'Verification Badge Style' : 'SUPA Badge Style';
  const subtitle = badgeType === 'verified' ? 'Customize your verified badge color' : 'Pick a color for your SUPA badge';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4" onClick={onClose}>
      <div
        className="bg-[#111318] border border-white/8 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div>
            <h2 className="font-black text-discord-text text-lg">{title}</h2>
            <p className="text-discord-muted text-xs mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-4 gap-3">
            {styles.map(style => {
              const isActive = selected === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => setSelected(style.id)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${
                    isActive
                      ? 'border-white/30 bg-white/8 scale-105'
                      : 'border-transparent bg-white/3 hover:bg-white/6'
                  }`}
                  style={isActive ? { boxShadow: `0 0 16px ${style.glow}` } : {}}
                >
                  <MetaBadgePreview color={style.color} glow={style.glow} size={38} animate={isActive} />
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
