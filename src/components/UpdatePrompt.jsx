import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onUpdate = (reg) => {
      // Find the new service worker
      const nw = reg.waiting || reg.installing;
      if (nw) {
        setWaitingWorker(nw);
        setShow(true);
      }
    };

    // Check current registration
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      
      // If there's already a worker waiting, show the prompt
      if (reg.waiting) {
        onUpdate(reg);
      }

      // Listen for new workers installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            onUpdate(reg);
          }
        });
      });
    });

    // When the new service worker takes over, reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting worker to activate
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback if worker lost
      window.location.reload();
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[90] md:left-auto md:right-6 md:w-80 animate-slide-up">
      <div
        className="rounded-2xl p-4 flex items-center gap-3 shadow-2xl"
        style={{
          background: 'rgba(17,19,24,0.97)',
          border: '1px solid rgba(88,101,242,0.4)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #5865f2, #eb459e)' }}
        >
          <FiRefreshCw size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-discord-text font-bold text-sm">Update Ready</p>
          <p className="text-discord-muted text-xs truncate">New version of VesselX is ready</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleUpdate}
            className="discord-btn text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <FiRefreshCw size={12} /> Reload
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
