import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { haptic } from '../utils/haptics';

const DISMISSED_KEY = 'vx_pwa_banner_dismissed_until';

export default function PWAInstallBanner() {
  const { isStandalone, canInstall, isIOS, install } = usePWA();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone) return;
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    if (canInstall || isIOS) {
      const t = setTimeout(() => setVisible(true), 8000);
      return () => clearTimeout(t);
    }
  }, [isStandalone, canInstall, isIOS]);

  const dismiss = () => {
    haptic('light');
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleInstall = async () => {
    haptic('medium');
    if (isIOS) {
      setVisible(false);
      return;
    }
    setInstalling(true);
    const ok = await install();
    setInstalling(false);
    if (ok) setVisible(false);
  };

  if (!visible || isStandalone) return null;

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-[999] px-4 pointer-events-none"
      style={{ animation: 'pwa-slide-up 0.4s cubic-bezier(0.34,1.3,0.64,1) both' }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="pointer-events-auto max-w-sm mx-auto bg-[#1a1d25] border border-discord-brand/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-discord-brand via-purple-500 to-discord-brand opacity-80" />
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-discord-brand flex items-center justify-center flex-shrink-0 shadow-lg shadow-discord-brand/30">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="18" fill="#5865f2" />
              <text x="50" y="72" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-discord-text font-bold text-sm">Install VesselX</p>
            {isIOS ? (
              <p className="text-discord-muted text-xs mt-0.5">Tap <span className="text-discord-brand font-semibold">Share</span> then <span className="text-discord-brand font-semibold">"Add to Home Screen"</span></p>
            ) : (
              <p className="text-discord-muted text-xs mt-0.5">Get the full app experience</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isIOS && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-discord-brand hover:bg-discord-brand/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-60"
              >
                {installing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Install'}
              </button>
            )}
            <button onClick={dismiss} className="text-discord-muted hover:text-discord-text transition-colors p-1 rounded-lg hover:bg-white/5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {isIOS && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-discord-muted text-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                <span className="text-discord-brand font-medium">Share</span>
              </div>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="text-discord-muted text-xs">Add to Home Screen</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5865f2" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
