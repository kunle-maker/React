import React from 'react';

export function FlameSVG({ color = '#FF6B35', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9.5 5.5 5 10 5 15a7 7 0 0014 0C19 10 14.5 5.5 12 2z" fill={color} />
      <path d="M12 10c-1 2-2 3.5-2 5.5a2 2 0 004 0c0-2-1-3.5-2-5.5z" fill="rgba(255,235,80,0.65)" />
    </svg>
  );
}

export function LightningSVG({ color = '#FFD700', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="13,2 5,14 12,14 11,22 19,10 12,10" fill={color} />
    </svg>
  );
}

export function Star5SVG({ color = '#FFD700', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
      />
    </svg>
  );
}

export function CrownSVG({ color = '#FFB300', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 19l2.5-11 4.5 5.5L12 5l2 8.5L18.5 8 21 19z" fill={color} />
      <rect x="3" y="19" width="18" height="3" rx="1.5" fill={color} />
      <circle cx="12" cy="6" r="1.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="6" cy="11" r="1.5" fill="rgba(255,255,255,0.6)" />
      <circle cx="18" cy="11" r="1.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

export function ShieldSVG({ color = '#1565C0', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 5v8c0 4.97 3.49 8.9 8 10 4.51-1.1 8-5.03 8-10V5z" fill={color} />
      <path d="M12 5L7 7.5v5.5c0 3 2 5.3 5 6.3 3-1 5-3.3 5-6.3V7.5z" fill="rgba(255,255,255,0.15)" />
      <polyline points="9,12 11,14 15,10" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function HeartSVG({ color = '#E91E63', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21l-1.5-1.35C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.5 11.15L12 21z" fill={color} />
      <path d="M7.5 5.5C5.57 5.5 4 7.07 4 9c0 2 1 3.5 8 8.5 7-5 8-6.5 8-8.5 0-1.93-1.57-3.5-3.5-3.5-1.2 0-2.25.63-2.9 1.58L12 9l-1.6-2.42C9.75 5.63 8.7 5.5 7.5 5.5z" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

export function SkullSVG({ color = '#ECEFF1', size = 20 }) {
  const dark = 'rgba(20,24,35,0.85)';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.03 2 3 6.03 3 11c0 2.8 1.3 5.3 3.3 7H6v4h12v-4h-.3C19.7 16.3 21 13.8 21 11 21 6.03 16.97 2 12 2z" fill={color} />
      <circle cx="9" cy="11" r="2.5" fill={dark} />
      <circle cx="15" cy="11" r="2.5" fill={dark} />
      <rect x="9" y="19" width="2" height="2" rx="0.5" fill={dark} />
      <rect x="13" y="19" width="2" height="2" rx="0.5" fill={dark} />
      <path d="M11 15h2" stroke={dark} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function MoonSVG({ color = '#B0C4DE', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" fill={color} />
    </svg>
  );
}

export function RocketSVG({ color = '#5C6BC0', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9 3.5 6 8 6 14h12C18 8 15 3.5 12 2z" fill={color} />
      <rect x="6" y="14" width="12" height="4" rx="0" fill="#37474F" />
      <path d="M6 18L3.5 22 8 20z" fill="#FF5722" />
      <path d="M18 18L20.5 22 16 20z" fill="#FF5722" />
      <circle cx="12" cy="8.5" r="2" fill="#B3E5FC" />
      <path d="M9 14h6" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </svg>
  );
}

export function LeafSVG({ color = '#4CAF50', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C17 8 13 3 5 4 5 4 4 14 10 18L12 20 14 18C20 14 17 8 17 8z" fill={color} />
      <line x1="11" y1="18.5" x2="17" y2="8" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="14.5" x2="10" y2="11" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="10.5" x2="12.5" y2="8.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="18.5" x2="11" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SnowflakeSVG({ color = '#80DEEA', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
        <line x1="12" y1="5" x2="10" y2="3" />
        <line x1="12" y1="5" x2="14" y2="3" />
        <line x1="12" y1="19" x2="10" y2="21" />
        <line x1="12" y1="19" x2="14" y2="21" />
        <line x1="5" y1="12" x2="3" y2="10" />
        <line x1="5" y1="12" x2="3" y2="14" />
        <line x1="19" y1="12" x2="21" y2="10" />
        <line x1="19" y1="12" x2="21" y2="14" />
      </g>
    </svg>
  );
}

export function PlanetSVG({ color = '#7E57C2', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="6" fill={color} />
      <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.2)" />
      <ellipse cx="12" cy="12" rx="11" ry="3.5" fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.55" transform="rotate(-20 12 12)" />
      <ellipse cx="12" cy="12" rx="11" ry="3.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" transform="rotate(-20 12 12)" />
    </svg>
  );
}

export function GhostSVG({ color = '#B0BEC5', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.58 2 4 5.58 4 10v12l3-2.5 3 2.5 2-2.5 2 2.5 3-2.5 3 2.5V10C20 5.58 16.42 2 12 2z" fill={color} />
      <circle cx="9" cy="11" r="1.8" fill="rgba(30,40,60,0.7)" />
      <circle cx="15" cy="11" r="1.8" fill="rgba(30,40,60,0.7)" />
      <path d="M9 15.5q3 2 6 0" stroke="rgba(30,40,60,0.5)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function TargetSVG({ color = '#F44336', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill={color} />
      <circle cx="12" cy="12" r="7" fill="white" />
      <circle cx="12" cy="12" r="4.5" fill={color} />
      <circle cx="12" cy="12" r="2" fill="white" />
      <circle cx="12" cy="12" r="1" fill={color} />
    </svg>
  );
}

export function TrophySVG({ color = '#FFD700', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4h8l-1.5 9C14 15.5 13 17 12 17s-2-1.5-2.5-4z" fill={color} />
      <path d="M4 6h4v5C8 13 6.5 14 5.5 13 4.5 12 4 10 4 8z" fill={color} opacity="0.8" />
      <path d="M20 6h-4v5c0 2 1.5 3 2.5 2 1-.5 1.5-2.5 1.5-5z" fill={color} opacity="0.8" />
      <rect x="9.5" y="17" width="5" height="2" fill={color} />
      <rect x="7" y="19" width="10" height="3" rx="1.5" fill={color} />
      <path d="M10 9l1.5 1.5L15 7" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function SwordSVG({ color = '#90A4AE', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="2.5" x2="12" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="12,2 10.5,7 13.5,7" fill={color} />
      <line x1="6.5" y1="15.5" x2="17.5" y2="15.5" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" />
      <rect x="10.5" y="18" width="3" height="4" rx="1" fill="#A1887F" />
    </svg>
  );
}

export function InfinitySVG({ color = '#9C27B0', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 12c0-2.21 1.79-4 4-4 1.38 0 2.6.7 3.33 1.76L12 12l1.33 2.24C14.1 15.3 15.32 16 16.67 16 18.55 16 20 14.55 20 12.67 20 10.55 18.21 9 16 9c-1.38 0-2.6.7-3.33 1.76L12 12l-1.33-2.24C9.9 8.7 8.68 8 7.33 8 5.45 8 4 9.45 4 11.33 4 13.45 5.79 15 8 15z"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PawSVG({ color = '#A1887F', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="15.5" rx="5" ry="4.5" fill={color} />
      <ellipse cx="8.5" cy="9.5" rx="2.2" ry="2.5" fill={color} />
      <ellipse cx="15.5" cy="9.5" rx="2.2" ry="2.5" fill={color} />
      <ellipse cx="6" cy="13.5" rx="2" ry="2.2" fill={color} />
      <ellipse cx="18" cy="13.5" rx="2" ry="2.2" fill={color} />
      <ellipse cx="12" cy="16" rx="2" ry="1.5" fill="rgba(0,0,0,0.2)" />
    </svg>
  );
}

export function ButterflySVG({ color = '#7B1FA2', size = 20 }) {
  const wing = color;
  const dark = 'rgba(0,0,0,0.3)';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12C12 12 7.5 6 3 5 1 5 1 9.5 4 11.5 7 13.5 12 12 12 12z" fill={wing} opacity="0.9" />
      <path d="M12 12C12 12 16.5 6 21 5 23 5 23 9.5 20 11.5 17 13.5 12 12 12 12z" fill={wing} opacity="0.9" />
      <path d="M12 12C12 12 7 14.5 4 18.5 3 20.5 5.5 22.5 8 20.5 11 18.5 12 12 12 12z" fill={wing} opacity="0.75" />
      <path d="M12 12C12 12 17 14.5 20 18.5 21 20.5 18.5 22.5 16 20.5 13 18.5 12 12 12 12z" fill={wing} opacity="0.75" />
      <ellipse cx="12" cy="12" rx="1.3" ry="5" fill={dark} />
      <circle cx="12" cy="7.5" r="1" fill={dark} />
    </svg>
  );
}

export function GemSVG({ color = '#00E5FF', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 20,8 16,22 8,22 4,8" fill={color} />
      <polygon points="12,2 20,8 12,10 4,8" fill="rgba(255,255,255,0.25)" />
      <line x1="4" y1="8" x2="20" y2="8" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" />
      <line x1="12" y1="10" x2="8" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
      <line x1="12" y1="10" x2="16" y2="22" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" />
    </svg>
  );
}

export function CrystalSVG({ color = '#CE93D8', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 18,7 20,14 16,22 8,22 4,14 6,7" fill={color} />
      <polygon points="12,2 18,7 12,9 6,7" fill="rgba(255,255,255,0.3)" />
      <line x1="6" y1="7" x2="18" y2="7" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
      <line x1="6" y1="7" x2="8" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1="18" y1="7" x2="16" y2="22" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1="12" y1="9" x2="12" y2="22" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
    </svg>
  );
}

export function EyeSVG({ color = '#00BCD4', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 12C5 6 8.5 3 12 3c3.5 0 7 3 10 9-3 6-6.5 9-10 9C8.5 21 5 18 2 12z" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill={color} />
      <circle cx="12" cy="12" r="2.2" fill="rgba(10,15,30,0.9)" />
      <circle cx="13" cy="10.5" r="0.9" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}

export function MusicSVG({ color = '#00BCD4', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 17V7l12-2v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="9" cy="17.5" r="2.5" fill={color} />
      <circle cx="21" cy="15.5" r="2.5" fill={color} />
    </svg>
  );
}

export function VortexSVG({ color = '#9C27B0', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 12a8 8 0 01-13.6 5.7" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M14 4.3A8 8 0 014 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M15.5 8.5A5 5 0 017 12" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M12 9a3 3 0 11-3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="12" cy="12" r="1.2" fill={color} />
    </svg>
  );
}

export function CometSVG({ color = '#FF4500', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="7" r="4" fill={color} />
      <path d="M13.5 10.5C10 12 4 14 2 18" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M12.5 12C9.5 13 5 15 3 19" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M14 11.5C11 13 7 16 5 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function SunSVG({ color = '#FFD54F', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4.5" fill={color} />
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
        <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
        <line x1="19.07" y1="4.93" x2="16.95" y2="7.05" />
        <line x1="7.05" y1="16.95" x2="4.93" y2="19.07" />
      </g>
    </svg>
  );
}

export function DragonSVG({ color = '#E53935', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 17C4 13 7 9 10 8L8 5l4 2 2-3 1 3.5C17 8.5 20 12 20 16c0 2-1.5 4-4 4H8c-2.5 0-4-1.5-4-3z" fill={color} />
      <circle cx="9" cy="14.5" r="1.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="15" cy="14.5" r="1.5" fill="rgba(255,255,255,0.5)" />
      <path d="M10 19h4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FlowerSVG({ color = '#F48FB1', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="7" rx="3" ry="4.5" fill={color} />
      <ellipse cx="12" cy="17" rx="3" ry="4.5" fill={color} />
      <ellipse cx="7" cy="12" rx="4.5" ry="3" fill={color} />
      <ellipse cx="17" cy="12" rx="4.5" ry="3" fill={color} />
      <ellipse cx="8.2" cy="8.2" rx="3" ry="4" transform="rotate(45 8.2 8.2)" fill={color} opacity="0.85" />
      <ellipse cx="15.8" cy="8.2" rx="3" ry="4" transform="rotate(-45 15.8 8.2)" fill={color} opacity="0.85" />
      <ellipse cx="8.2" cy="15.8" rx="3" ry="4" transform="rotate(-45 8.2 15.8)" fill={color} opacity="0.85" />
      <ellipse cx="15.8" cy="15.8" rx="3" ry="4" transform="rotate(45 15.8 15.8)" fill={color} opacity="0.85" />
      <circle cx="12" cy="12" r="3.5" fill="#FFF9C4" />
      <circle cx="12" cy="12" r="2" fill="#FFD740" />
    </svg>
  );
}

export function DiamondSVG({ color = '#40C4FF', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 22,9 12,22 2,9" fill={color} />
      <polygon points="12,2 22,9 12,11 2,9" fill="rgba(255,255,255,0.3)" />
      <line x1="2" y1="9" x2="22" y2="9" stroke="rgba(255,255,255,0.4)" strokeWidth="0.75" />
      <line x1="12" y1="11" x2="2" y2="9" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
      <line x1="12" y1="11" x2="22" y2="9" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
    </svg>
  );
}

export function UFOsvg({ color = '#26C6DA', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="13" rx="10" ry="5" fill={color} />
      <path d="M8 13c0-3.5 1.8-7 4-8 2.2 1 4 4.5 4 8" fill="rgba(100,200,255,0.6)" />
      <ellipse cx="12" cy="13.5" rx="10" ry="2" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="9" cy="13" r="1" fill="rgba(255,255,100,0.8)" />
      <circle cx="12" cy="12.5" r="1" fill="rgba(255,255,100,0.8)" />
      <circle cx="15" cy="13" r="1" fill="rgba(255,255,100,0.8)" />
    </svg>
  );
}

export function GalaxyStarSVG({ color = '#B39DDB', size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9 8 2 9 2 12c0 3 7 4 10 10 3-6 10-7 10-10 0-3-7-4-10-10z" fill={color} />
      <path d="M12 6c-2 4-6 5-6 6 0 1 4 2 6 6 2-4 6-5 6-6 0-1-4-2-6-6z" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

export const BADGE_SVG_MAP = {
  flame:    FlameSVG,
  lightning: LightningSVG,
  star5:    Star5SVG,
  crown:    CrownSVG,
  shield:   ShieldSVG,
  heart:    HeartSVG,
  skull:    SkullSVG,
  moon:     MoonSVG,
  rocket:   RocketSVG,
  leaf:     LeafSVG,
  snowflake: SnowflakeSVG,
  planet:   PlanetSVG,
  ghost:    GhostSVG,
  target:   TargetSVG,
  trophy:   TrophySVG,
  sword:    SwordSVG,
  infinity: InfinitySVG,
  paw:      PawSVG,
  butterfly: ButterflySVG,
  gem:      GemSVG,
  crystal:  CrystalSVG,
  eye:      EyeSVG,
  music:    MusicSVG,
  vortex:   VortexSVG,
  comet:    CometSVG,
  sun:      SunSVG,
  dragon:   DragonSVG,
  flower:   FlowerSVG,
  diamond:  DiamondSVG,
  ufo:      UFOsvg,
  galaxy_star: GalaxyStarSVG,
};
