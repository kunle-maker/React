import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Groups from './pages/Groups';
import GroupChat from './pages/GroupChat';
import GroupMembers from './pages/GroupMembers';
import GroupInfo from './pages/GroupInfo';
import Notifications from './pages/Notifications';
import CreatePostPage from './pages/CreatePostPage';
import Search from './pages/Search';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import FullPostView from './pages/FullPostView';
import JoinGroup from './pages/JoinGroup';
import AdminPanel from './pages/AdminPanel';
import ModeratorBot from './pages/ModeratorBot';
import API from './utils/api';
import socket from './utils/socket';
import InstallPrompt from './components/InstallPrompt';
import DigitalPlatAd from './components/DigitalPlatAd';
import { I18nProvider, useI18n } from './contexts/I18nContext';

async function registerPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const reg = await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await API.subscribePush(existing.toJSON());
      return;
    }

    let vapidKey;
    try {
      const res = await API.getVapidPublicKey();
      vapidKey = res.publicKey || res.vapidPublicKey || res.key;
    } catch { return; }

    if (!vapidKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await API.subscribePush(sub.toJSON());
  } catch (err) {
    console.warn('Push registration failed:', err.message);
  }
}

async function registerBackgroundSync(token) {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;

    // Send token to SW for background operations
    if (reg.active && token) {
      reg.active.postMessage({ type: 'STORE_TOKEN', token });
    }

    // Register background sync tags
    if ('sync' in reg) {
      await reg.sync.register('sync-notifications').catch(() => {});
    }
  } catch {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function ProtectedRoute({ children, token }) {
  return token ? children : <Navigate to="/login" replace />;
}

function AppInner() {
  const { loadTranslations } = useI18n();
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0, groups: 0 });

  const loadUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
      const data = await API.getProfile();
      const user = data?.user || data;
      if (user?.username) {
        setCurrentUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        socket.connect(user._id || user.id, t);
        registerPushNotifications().catch(() => {});
        if (user.language) {
          loadTranslations(user.language).catch(() => {});
        }
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setCurrentUser(null);
      }
    }
  }, [loadTranslations]);

  useEffect(() => {
    if (token) loadUser();
  }, [token]);

  useEffect(() => {
    const handler = () => {
      const t = localStorage.getItem('token');
      setToken(t);
      if (!t) {
        setCurrentUser(null);
        socket.disconnect();
      }
    };
    window.addEventListener('authChange', handler);
    return () => window.removeEventListener('authChange', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      setCurrentUser(e.detail);
      localStorage.setItem('user', JSON.stringify(e.detail));
    };
    window.addEventListener('profileUpdate', handler);
    return () => window.removeEventListener('profileUpdate', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { type, increment } = e.detail;
      setUnreadCounts(prev => ({ ...prev, [type]: (prev[type] || 0) + increment }));
    };
    window.addEventListener('unreadCountUpdate', handler);
    return () => window.removeEventListener('unreadCountUpdate', handler);
  }, []);

  useEffect(() => {
    if (!token) return;
    const pollSupaStatus = async () => {
      try {
        const data = await API.getSupaStatus();
        const stored = localStorage.getItem('user');
        if (!stored) return;
        const user = JSON.parse(stored);
        if (user.isSupa !== data.isSupa) {
          const updated = { ...user, isSupa: data.isSupa, supaExpiresAt: data.expiresAt };
          localStorage.setItem('user', JSON.stringify(updated));
          setCurrentUser(updated);
          window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
        }
      } catch { }
    };
    const interval = setInterval(pollSupaStatus, 30 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const fetchNotifCount = async () => {
      try {
        API.clearCache('/api/notifications');
        const data = await API.getNotificationUnreadCount();
        const count = data?.count ?? 0;
        setUnreadCounts(prev => ({ ...prev, notifications: count }));
      } catch { }
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 10 * 1000);
    const reset = () => setUnreadCounts(prev => ({ ...prev, notifications: 0 }));
    window.addEventListener('resetNotifications', reset);
    return () => { clearInterval(interval); window.removeEventListener('resetNotifications', reset); };
  }, [token]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data?.url) {
        window.location.hash = event.data.url;
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const sharedProps = { currentUser, unreadCounts };

  return (
    <HashRouter>
      <InstallPrompt />
      <DigitalPlatAd currentUser={currentUser} />
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/join/:code" element={token ? <JoinGroup /> : <Navigate to="/login" replace />} />
        <Route path="/" element={<ProtectedRoute token={token}><Feed {...sharedProps} /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute token={token}><Search {...sharedProps} /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute token={token}><Notifications {...sharedProps} /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute token={token}><CreatePostPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute token={token}><Messages {...sharedProps} /></ProtectedRoute>} />
        <Route path="/messages/:username" element={<ProtectedRoute token={token}><Messages {...sharedProps} /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute token={token}><Groups {...sharedProps} /></ProtectedRoute>} />
        <Route path="/groups/:groupId" element={<ProtectedRoute token={token}><GroupChat {...sharedProps} /></ProtectedRoute>} />
        <Route path="/groups/:groupId/members" element={<ProtectedRoute token={token}><GroupMembers {...sharedProps} /></ProtectedRoute>} />
        <Route path="/groups/:groupId/info" element={<ProtectedRoute token={token}><GroupInfo {...sharedProps} /></ProtectedRoute>} />
        <Route path="/profile/:username" element={<ProtectedRoute token={token}><Profile {...sharedProps} /></ProtectedRoute>} />
        <Route path="/post/:postId" element={<ProtectedRoute token={token}><FullPostView {...sharedProps} /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute token={token}><AIAssistant {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute token={token}><Settings {...sharedProps} /></ProtectedRoute>} />
        <Route path="/vx-admin" element={<ProtectedRoute token={token}><AdminPanel {...sharedProps} /></ProtectedRoute>} />
        <Route path="/mod-bot" element={<ProtectedRoute token={token}><ModeratorBot {...sharedProps} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

function SplashHider() {
  useEffect(() => {
    if (typeof window.__hideSplash === 'function') {
      window.__hideSplash();
    }
  }, []);
  return null;
}

export default function App() {
  return (
    <I18nProvider>
      <SplashHider />
      <AppInner />
    </I18nProvider>
  );
}
