import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';

const APP_VERSION = '2.0.0';
const UPDATE_CHECK_URL = 'https://vesselx-updates.onrender.com/update';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const VERSION_KEY = 'vx-app-version';
const LAST_CHECK_KEY = 'vx-last-check';
const FIRST_VISIT_KEY = 'vx-first-visit';

async function clearAllSiteData() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {}
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
  } catch {}
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  localStorage.clear();
  sessionStorage.clear();
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', user);
  document.cookie.split(';').forEach(c => {
    document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  });
}

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const now = Date.now();
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
    const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (!firstVisit) {
      localStorage.setItem(FIRST_VISIT_KEY, String(now));
      localStorage.setItem(LAST_CHECK_KEY, String(now));
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      clearAllSiteData().catch(() => {});
      return;
    }

    const shouldCheck =
      !lastCheck ||
      now - Number(lastCheck) > THIRTY_DAYS_MS ||
      storedVersion !== APP_VERSION;

    if (shouldCheck) {
      localStorage.setItem(LAST_CHECK_KEY, String(now));
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      fetch(UPDATE_CHECK_URL, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          const serverVersion = data?.version;
          if (serverVersion && serverVersion !== APP_VERSION) {
            setShow(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleUpdate = async () => {
    setShow(false);
    await clearAllSiteData();
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    window.location.reload(true);
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
          <p className="text-discord-text font-bold text-sm">Update Available</p>
          <p className="text-discord-muted text-xs truncate">A new version of VesselX is ready</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleUpdate}
            className="discord-btn text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            <FiRefreshCw size={12} /> Update
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
