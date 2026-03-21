import React from 'react';
import { getBadgeById } from '../data/badges';
import { getStoredSupaBadgeStyle, getSupaBadgeStyle } from './VerificationBadgePicker';

function starburstPath() {
  const cx = 12, cy = 12, outerR = 11.5, innerR = 8.8, pts = 12;
  let d = '';
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI / pts) - Math.PI / 2;
    d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(angle)).toFixed(2) + ',' + (cy + r * Math.sin(angle)).toFixed(2);
  }
  return d + 'Z';
}

const STARBURST = starburstPath();

export const VERIFIED_BADGE_STYLES = [
  { id: 'blue',     label: 'Classic Blue', color: '#1D9BF0', glow: 'rgba(29,155,240,0.55)' },
  { id: 'gold',     label: 'Gold',         color: '#FFB300', glow: 'rgba(255,179,0,0.55)' },
  { id: 'purple',   label: 'Amethyst',     color: '#8E24AA', glow: 'rgba(142,36,170,0.55)' },
  { id: 'green',    label: 'Emerald',      color: '#00897B', glow: 'rgba(0,137,123,0.55)' },
  { id: 'silver',   label: 'Silver',       color: '#90A4AE', glow: 'rgba(144,164,174,0.55)' },
  { id: 'teal',     label: 'Teal',         color: '#1ABC9C', glow: 'rgba(26,188,156,0.55)' },
  { id: 'pink',     label: 'Rose',         color: '#E91E8C', glow: 'rgba(233,30,140,0.55)' },
  { id: 'orange',   label: 'Amber',        color: '#FB8C00', glow: 'rgba(251,140,0,0.55)' },
  { id: 'cyan',     label: 'Aqua',         color: '#00ACC1', glow: 'rgba(0,172,193,0.55)' },
  { id: 'indigo',   label: 'Indigo',       color: '#5865F2', glow: 'rgba(88,101,242,0.55)' },
  { id: 'lime',     label: 'Lime',         color: '#76FF03', glow: 'rgba(118,255,3,0.55)' },
  { id: 'red',      label: 'Crimson',      color: '#E53935', glow: 'rgba(229,57,53,0.55)' },
  { id: 'coral',    label: 'Coral',        color: '#FF6B6B', glow: 'rgba(255,107,107,0.55)' },
  { id: 'mint',     label: 'Mint',         color: '#00E676', glow: 'rgba(0,230,118,0.55)' },
  { id: 'lavender', label: 'Lavender',     color: '#B39DDB', glow: 'rgba(179,157,219,0.55)' },
  { id: 'sky',      label: 'Sky',          color: '#29B6F6', glow: 'rgba(41,182,246,0.55)' },
  { id: 'bronze',   label: 'Bronze',       color: '#CD7F32', glow: 'rgba(205,127,50,0.55)' },
  { id: 'ruby',     label: 'Ruby',         color: '#FF1744', glow: 'rgba(255,23,68,0.55)' },
  { id: 'jade',     label: 'Jade',         color: '#00C853', glow: 'rgba(0,200,83,0.55)' },
  { id: 'magenta',  label: 'Magenta',      color: '#D500F9', glow: 'rgba(213,0,249,0.55)' },
  { id: 'navy',     label: 'Navy',         color: '#1A237E', glow: 'rgba(26,35,126,0.55)' },
  { id: 'peach',    label: 'Peach',        color: '#FFAB76', glow: 'rgba(255,171,118,0.55)' },
  { id: 'electric', label: 'Electric',     color: '#00E5FF', glow: 'rgba(0,229,255,0.55)' },
  { id: 'forest',   label: 'Forest',       color: '#2E7D32', glow: 'rgba(46,125,50,0.55)' },
];

export function getVerifiedBadgeStyle(styleId) {
  return VERIFIED_BADGE_STYLES.find(s => s.id === styleId) || VERIFIED_BADGE_STYLES[0];
}

export function getStoredVerifiedBadgeStyle(username) {
  try { return localStorage.getItem(`verifiedBadgeStyle_${username}`) || 'blue'; } catch { return 'blue'; }
}
export function setStoredVerifiedBadgeStyle(username, styleId) {
  try { localStorage.setItem(`verifiedBadgeStyle_${username}`, styleId); } catch {}
}

export function VerifiedBadge({ size = 16, username }) {
  const styleId = username ? getStoredVerifiedBadgeStyle(username) : 'blue';
  const style = getVerifiedBadgeStyle(styleId);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="meta-badge-supa-anim flex-shrink-0"
      title="Verified"
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${style.glow})` }}
    >
      <path d={STARBURST} fill={style.color} />
      <polyline points="7.5,12 10.5,15 16.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function SupaBadge({ size = 16, username }) {
  const styleId = username ? getStoredSupaBadgeStyle(username) : 'red';
  const style = getSupaBadgeStyle(styleId);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="meta-badge-supa-anim flex-shrink-0"
      title="SUPA"
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${style.glow})` }}
    >
      <path d={STARBURST} fill={style.color} />
      <polyline points="7.5,12 10.5,15 16.5,9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function AnimatedBadge({ badgeId, size = '1.1em' }) {
  const badge = getBadgeById(badgeId);
  if (!badge) return null;
  return (
    <span
      className={`badge-anim-${badge.animation} inline-block select-none`}
      style={{ fontSize: size, lineHeight: 1 }}
      title={badge.label}
    >
      {badge.emoji}
    </span>
  );
}

export default function UserBadge({ user, small = false }) {
  if (!user) return null;
  const badgeId = user.badge;
  const size = small ? 13 : 16;
  return (
    <>
      {user.isVerified && <VerifiedBadge size={size} />}
      {user.isSupa && <SupaBadge size={size} username={user.username} />}
      {badgeId && <AnimatedBadge badgeId={badgeId} size={small ? '0.9em' : '1.1em'} />}
    </>
  );
}
