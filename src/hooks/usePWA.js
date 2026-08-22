import { useState, useEffect } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const standalone = mq.matches || navigator.standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    const mqHandler = (e) => setIsStandalone(e.matches);
    mq.addEventListener('change', mqHandler);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstallPrompt(null); setCanInstall(false); });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      mq.removeEventListener('change', mqHandler);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    try {
      const result = await installPrompt.prompt();
      if (result?.outcome === 'accepted') {
        setInstallPrompt(null);
        setCanInstall(false);
        return true;
      }
    } catch {}
    return false;
  };

  return { isStandalone, canInstall, isIOS, install };
}
