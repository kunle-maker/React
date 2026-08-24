import React from 'react';
import { getBadgeById } from '../data/badges';
import { BADGE_SVG_MAP } from './BadgeSVGs';

/* ── Verified badge styles ───────────────────────────────────────── */
export const VERIFIED_BADGE_STYLES = [
  { id: 'blue',     label: 'Sapphire',  color: '#1D9BF0', glow: 'rgba(29,155,240,0.55)' },
  { id: 'gold',     label: 'Gold',      color: '#FFB300', glow: 'rgba(255,179,0,0.55)' },
  { id: 'purple',   label: 'Amethyst',  color: '#8E24AA', glow: 'rgba(142,36,170,0.55)' },
  { id: 'green',    label: 'Emerald',   color: '#00897B', glow: 'rgba(0,137,123,0.55)' },
  { id: 'silver',   label: 'Silver',    color: '#90A4AE', glow: 'rgba(144,164,174,0.55)' },
  { id: 'teal',     label: 'Teal',      color: '#1ABC9C', glow: 'rgba(26,188,156,0.55)' },
  { id: 'pink',     label: 'Rose',      color: '#E91E8C', glow: 'rgba(233,30,140,0.55)' },
  { id: 'orange',   label: 'Amber',     color: '#FB8C00', glow: 'rgba(251,140,0,0.55)' },
  { id: 'cyan',     label: 'Aqua',      color: '#00ACC1', glow: 'rgba(0,172,193,0.55)' },
  { id: 'indigo',   label: 'Indigo',    color: '#5865F2', glow: 'rgba(88,101,242,0.55)' },
  { id: 'lime',     label: 'Lime',      color: '#76FF03', glow: 'rgba(118,255,3,0.55)' },
  { id: 'red',      label: 'Crimson',   color: '#E53935', glow: 'rgba(229,57,53,0.55)' },
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

export function getVerifiedBadgeStyle(styleId) {
  return VERIFIED_BADGE_STYLES.find(s => s.id === styleId) || VERIFIED_BADGE_STYLES[0];
}
export function getStoredVerifiedBadgeStyle(username) {
  try { return localStorage.getItem(`verifiedBadgeStyle_${username}`) || 'blue'; } catch { return 'blue'; }
}
export function setStoredVerifiedBadgeStyle(username, styleId) {
  try { localStorage.setItem(`verifiedBadgeStyle_${username}`, styleId); } catch {}
}

/* ── SUPA badge styles ───────────────────────────────────────────── */
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

/* ── Shape metadata ──────────────────────────────────────────────── */
export const VERIFIED_BADGE_SHAPES = [
  { id: 'shield', label: 'Shield' },
  { id: 'gem',    label: 'Gem'    },
  { id: 'seal',   label: 'Seal'   },
];
export const SUPA_BADGE_SHAPES = [
  { id: 'hex',   label: 'Hex'   },
  { id: 'crown', label: 'Crown' },
  { id: 'star',  label: 'Star'  },
];

export function getStoredVerifiedBadgeShape(username) {
  try { return localStorage.getItem(`verifiedBadgeShape_${username}`) || 'shield'; } catch { return 'shield'; }
}
export function setStoredVerifiedBadgeShape(username, shapeId) {
  try { localStorage.setItem(`verifiedBadgeShape_${username}`, shapeId); } catch {}
}
export function getStoredSupaBadgeShape(username) {
  try { return localStorage.getItem(`supaBadgeShape_${username}`) || 'hex'; } catch { return 'hex'; }
}
export function setStoredSupaBadgeShape(username, shapeId) {
  try { localStorage.setItem(`supaBadgeShape_${username}`, shapeId); } catch {}
}

/* ── Verified shape SVGs ─────────────────────────────────────────── */

export function ShieldSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="Verified" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <path d="M12 2 L20 5.8 L20 13 Q20 18.8 12 22 Q4 18.8 4 13 L4 5.8 Z" fill={color} />
      <path d="M8 6.5 Q12 5 16 6.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <polyline points="7.8,12 10.5,14.8 16.2,9" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function GemSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="Verified" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <path d="M9 2 L15 2 L20 7 L20 17 L15 22 L9 22 L4 17 L4 7 Z" fill={color} />
      <path d="M4 7 L9 8.5 L15 8.5 L20 7" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
      <path d="M9 2 L12 6.5 L15 2" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
      <path d="M9 8.5 L12 6.5 L15 8.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" fill="none" />
      <polyline points="7.8,14 10.5,16.8 16.2,11" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function SealSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="Verified" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <circle cx="12" cy="12" r="10" fill={color} />
      <circle cx="12" cy="12" r="7.8" stroke="rgba(255,255,255,0.28)" strokeWidth="0.9" fill="none" />
      <circle cx="12" cy="12" r="5.5" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" fill="none" />
      <polyline points="7.8,12 10.5,14.8 16.2,9" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* ── SUPA shape SVGs ─────────────────────────────────────────────── */

export function HexSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="SUPA" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <path d="M12 2.5 L20.66 7.25 L20.66 16.75 L12 21.5 L3.34 16.75 L3.34 7.25 Z" fill={color} />
      <path d="M12 2.5 L20.66 7.25 L20.66 16.75 L12 21.5 L3.34 16.75 L3.34 7.25 Z" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" fill="none" />
      <path d="M13.5 4.5 L8.5 13 L12 13 L10.5 19.5 L15.5 11 L12 11 Z" fill="white" opacity="0.92" />
    </svg>
  );
}

export function CrownSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="SUPA" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <path d="M3 19 L3 14 L7 9.5 L9 14 L12 8 L15 14 L17 9.5 L21 14 L21 19 Z" fill={color} />
      <line x1="3" y1="19" x2="21" y2="19" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <circle cx="7" cy="9" r="1.3" fill="white" opacity="0.85" />
      <circle cx="12" cy="7.5" r="1.3" fill="white" opacity="0.85" />
      <circle cx="17" cy="9" r="1.3" fill="white" opacity="0.85" />
      <path d="M10.5 14.5 L13.5 14.5 L13 17.5 L11 17.5 Z" fill="white" opacity="0.55" />
    </svg>
  );
}

export function StarSVG({ color, glow, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="flex-shrink-0"
      title="SUPA" style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${glow})` }}>
      <path d="M12 2 L14.47 7.67 L20.66 7 L17 12 L20.66 17 L14.47 16.33 L12 22 L9.53 16.33 L3.34 17 L7 12 L3.34 7 L9.53 7.67 Z" fill={color} />
      <path d="M12 2 L14.47 7.67 L20.66 7 L17 12 L20.66 17 L14.47 16.33 L12 22 L9.53 16.33 L3.34 17 L7 12 L3.34 7 L9.53 7.67 Z" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6" fill="none" />
      <path d="M13.5 8.5 L10 13 L12.5 13 L10.5 15.5 L14 11 L11.5 11 Z" fill="white" opacity="0.9" />
    </svg>
  );
}

/* ── Shape dispatch maps ─────────────────────────────────────────── */
export const VERIFIED_SHAPE_MAP = { shield: ShieldSVG, gem: GemSVG, seal: SealSVG };
export const SUPA_SHAPE_MAP    = { hex: HexSVG, crown: CrownSVG, star: StarSVG };

/* ── Badge render components ─────────────────────────────────────── */

export function VerifiedBadge({ size = 16, username }) {
  const styleId = username ? getStoredVerifiedBadgeStyle(username) : 'blue';
  const style = getVerifiedBadgeStyle(styleId);
  // Instagram-style verification badge: rosette/seal outer shape + bold white checkmark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="flex-shrink-0"
      title="Verified"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: `drop-shadow(0 0 3px ${style.glow})`,
      }}
    >
      {/* Rosette/seal outline — 12-point star made from two overlapping rotated squares */}
      <path
        d="M16 2
           L18.5 5.5 L22.5 4.5 L22.5 8.5 L26.5 9.5 L24.5 13
           L28 16 L24.5 19 L26.5 22.5 L22.5 23.5 L22.5 27.5
           L18.5 26.5 L16 30 L13.5 26.5 L9.5 27.5 L9.5 23.5
           L5.5 22.5 L7.5 19 L4 16 L7.5 13 L5.5 9.5
           L9.5 8.5 L9.5 4.5 L13.5 5.5 Z"
        fill={style.color}
      />
      {/* Bold white checkmark — Instagram proportions */}
      <polyline
        points="9,16.5 13.5,21 23,11"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SupaBadge({ size = 16, username }) {
  const styleId = username ? getStoredSupaBadgeStyle(username) : 'red';
  const style = getSupaBadgeStyle(styleId);
  // Telegram-style: filled circle + bold white checkmark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="flex-shrink-0"
      title="Supa"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: `drop-shadow(0 0 3px ${style.glow})`,
      }}
    >
      {/* Filled circle */}
      <circle cx="12" cy="12" r="11" fill={style.color} />
      {/* Subtle inner ring for depth */}
      <circle cx="12" cy="12" r="9.5" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" fill="none" />
      {/* Bold white checkmark — matches Telegram's tick proportions */}
      <polyline
        points="6.5,12.5 10,16 17.5,8"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function AnimatedBadge({ badgeId, size = 20 }) {
  const badge = getBadgeById(badgeId);
  if (!badge) return null;
  const SvgComp = BADGE_SVG_MAP[badge.svgId];
  if (!SvgComp) return null;
  const px = typeof size === 'number' ? size : 20;
  return (
    <span
      className={`badge-anim-${badge.animation} inline-block select-none flex-shrink-0`}
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: `drop-shadow(0 0 4px ${badge.glow})` }}
      title={badge.label}
    >
      <SvgComp color={badge.color} size={px} />
    </span>
  );
}

export default function UserBadge({ user, small = false }) {
  if (!user) return null;
  const badgeId = user.badge;
  const size = small ? 13 : 16;
  return (
    <>
      {user.isVerified && <VerifiedBadge size={size} username={user.username} />}
      {user.isSupa && <SupaBadge size={size} username={user.username} />}
      {badgeId && <AnimatedBadge badgeId={badgeId} size={size} />}
    </>
  );
}
