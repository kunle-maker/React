import React, { useState, useEffect } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';

const APP_DOWNLOAD_URL = 'https://kunle.shorty.gy/VesselX';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return;
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInstall = () => {
    window.open(APP_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[90] md:left-auto md:right-6 md:w-80 animate-slide-up">
      <div
        className="rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
        style={{
          background: 'rgba(17,19,24,0.95)',
          border: '1px solid rgba(88,101,242,0.3)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #5865f2, #eb459e)' }}
        >
          <span className="text-white font-black text-lg">V</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-discord-text font-bold text-sm">Get the VesselX App</p>
          <p className="text-discord-muted text-xs truncate">Download the full app experience</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="discord-btn text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <FiDownload size={12} /> Download
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
