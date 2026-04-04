import React, { useState, useEffect } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || window.navigator.standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Show the prompt after a short delay if not dismissed before
      if (!localStorage.getItem('pwa-install-dismissed')) {
        const timer = setTimeout(() => setShow(true), 5000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShow(false);
      setIsStandalone(true);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  // Don't show if already installed, or if prompt not available, or if hidden
  if (isStandalone || !show || !deferredPrompt) return null;

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
          <p className="text-discord-text font-bold text-sm">Install VesselX</p>
          <p className="text-discord-muted text-xs truncate">Add to home screen for the best experience</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="discord-btn text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <FiPlus size={14} /> Install
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
