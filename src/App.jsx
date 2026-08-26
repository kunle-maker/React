import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import API from './utils/api';
import socket from './utils/socket';
import UpdatePrompt from './components/UpdatePrompt';
import DigitalPlatAd from './components/DigitalPlatAd';
import PWAInstallBanner from './components/PWAInstallBanner';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import Search         from './pages/Search';
import Notifications  from './pages/Notifications';
import CreatePostPage from './pages/CreatePostPage';

const Login          = lazy(() => import('./pages/Login'));
const Register       = lazy(() => import('./pages/Register'));
const VerifyEmail    = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Feed           = lazy(() => import('./pages/Feed'));
const Profile        = lazy(() => import('./pages/Profile'));
const Messages       = lazy(() => import('./pages/Messages'));
const Groups         = lazy(() => import('./pages/Groups'));
const GroupChat      = lazy(() => import('./pages/GroupChat'));
const GroupMembers   = lazy(() => import('./pages/GroupMembers'));
const GroupInfo      = lazy(() => import('./pages/GroupInfo'));
const AIAssistant    = lazy(() => import('./pages/AIAssistant'));
const Settings       = lazy(() => import('./pages/Settings'));
const FullPostView   = lazy(() => import('./pages/FullPostView'));
const JoinGroup      = lazy(() => import('./pages/JoinGroup'));
const AdminPanel     = lazy(() => import('./pages/AdminPanel'));
const ModeratorBot   = lazy(() => import('./pages/ModeratorBot'));
const Reels          = lazy(() => import('./pages/Reels'));
const Games          = lazy(() => import('./pages/Games'));
const Developer      = lazy(() => import('./pages/Developer'));
const SupaPaymentCallback = lazy(() => import('./pages/SupaPaymentCallback'));
const SlugRedirect   = lazy(() => import('./pages/SlugRedirect'));
const PostQuotes     = lazy(() => import('./pages/PostQuotes'));

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0f14', color: '#e2e5ea', gap: 12 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>Something went wrong</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.hash = '/'; }} style={{ padding: '8px 20px', background: '#5865f2', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-discord-bg">
      <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function GlobalFeatures() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  useKeyboardShortcuts({ onShowHelp: () => setShowShortcuts(true) });
  return (
    <>
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

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
  const [moderationModal, setModerationModal] = useState(null);
  const [moderationBanner, setModerationBanner] = useState(null); // { status: 'limited'|'banned' }

  useEffect(() => {
    const handler = (e) => setModerationModal(e.detail);
    window.addEventListener('moderationViolation', handler);
    return () => window.removeEventListener('moderationViolation', handler);
  }, []);

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
        API.getVesselXDomainGroup().catch(() => {});
        // Show moderation banner if account is limited or banned
        if (user.moderation?.status === 'limited' || user.moderation?.status === 'banned') {
          setModerationBanner({ status: user.moderation.status });
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
    if (!token) return;
    API.sendHeartbeat().catch(() => {});
    const hbInterval = setInterval(() => API.sendHeartbeat().catch(() => {}), 60000);
    return () => clearInterval(hbInterval);
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

  // ── Page Visibility → online/offline status ──────────────────────────────
  // When the user switches tabs or the mobile browser backgrounds the PWA,
  // emit setOnlineStatus so followers' green dots update in real time.
  useEffect(() => {
    if (!token) return;
    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      socket.setOnlineStatus(visible);
      // Mirror through the REST endpoint so the server persists the state
      // even if the socket hasn't reconnected yet (e.g. after a brief disconnect).
      API.setMyOnlineStatus(visible).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [token]);

  // ── Global userStatusUpdate → keep currentUser.isOnline in sync ──────────
  // When the server notifies that *our own* status changed (e.g. on another
  // device) we update the stored user object so Avatar dots stay accurate.
  useEffect(() => {
    const handler = (e) => {
      const { userId, isOnline, lastSeen } = e.detail || {};
      if (!userId) return;
      const myId = currentUser?._id || currentUser?.id;
      if (userId === myId) {
        const updated = { ...currentUser, isOnline, lastSeen: lastSeen ?? null };
        setCurrentUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    };
    window.addEventListener('userStatusUpdate', handler);
    return () => window.removeEventListener('userStatusUpdate', handler);
  }, [currentUser]);

  const sharedProps = { currentUser, unreadCounts };

  return (
    <HashRouter>
      <UpdatePrompt />
      <DigitalPlatAd currentUser={currentUser} />
      <PWAInstallBanner />
      <GlobalFeatures />

      {/* Moderation sticky banner */}
      {moderationBanner && (
        <div className={`fixed top-0 left-0 right-0 z-[9998] flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold ${moderationBanner.status === 'banned' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
          <span>
            {moderationBanner.status === 'banned'
              ? '⛔ Your account has been banned. Some features are disabled.'
              : '⚠️ Your account is temporarily limited. Some features may be restricted.'}
          </span>
          <button
            onClick={() => setModerationBanner(null)}
            className="flex-shrink-0 opacity-80 hover:opacity-100 font-black text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Moderation violation modal */}
      {moderationModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1c23] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <span className="text-2xl">🚫</span>
              </div>
              <h3 className="text-lg font-black text-white">Action Blocked</h3>
            </div>
            <p className="text-gray-300 text-sm text-center mb-4">{moderationModal.error || moderationModal.message}</p>
            {(moderationModal.violation || moderationModal.reason) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 space-y-1.5">
                {moderationModal.violation && (
                  <p className="text-red-400 text-xs font-semibold">Violation: {moderationModal.violation}</p>
                )}
                {moderationModal.reason && (
                  <p className="text-red-300 text-xs">Reason: {moderationModal.reason}</p>
                )}
              </div>
            )}
            {moderationModal.moderation?.status === 'limited' && (
              <p className="text-yellow-400 text-xs font-semibold text-center mb-3">⚠️ Your account is temporarily limited</p>
            )}
            {moderationModal.moderation?.status === 'banned' && (
              <p className="text-red-400 text-xs font-semibold text-center mb-3">⛔ Your account has been banned</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModerationModal(null);
                  window.location.hash = '/settings?section=support';
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 font-semibold text-sm hover:bg-red-500/30 transition-colors"
              >
                Contact Support
              </button>
              <button
                onClick={() => setModerationModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/join/:code" element={token ? <JoinGroup /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<ProtectedRoute token={token}><Feed {...sharedProps} /></ProtectedRoute>} />
          <Route path="/reels" element={<ProtectedRoute token={token}><Reels {...sharedProps} /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute token={token}><Search {...sharedProps} /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute token={token}><Notifications {...sharedProps} /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute token={token}><CreatePostPage {...sharedProps} /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute token={token}><Messages {...sharedProps} /></ProtectedRoute>} />
          <Route path="/messages/chat/:username" element={<ProtectedRoute token={token}><Messages {...sharedProps} /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute token={token}><Groups {...sharedProps} /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute token={token}><GroupChat {...sharedProps} /></ProtectedRoute>} />
          <Route path="/groups/:groupId/members" element={<ProtectedRoute token={token}><GroupMembers {...sharedProps} /></ProtectedRoute>} />
          <Route path="/groups/:groupId/info" element={<ProtectedRoute token={token}><GroupInfo {...sharedProps} /></ProtectedRoute>} />
          <Route path="/profile/:username" element={<ProtectedRoute token={token}><Profile {...sharedProps} /></ProtectedRoute>} />
          <Route path="/post/:postId" element={<ProtectedRoute token={token}><FullPostView {...sharedProps} /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute token={token}><AIAssistant {...sharedProps} /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute token={token}><Settings {...sharedProps} /></ProtectedRoute>} />
          <Route path="/developer" element={<ProtectedRoute token={token}><Developer {...sharedProps} /></ProtectedRoute>} />
          <Route path="/vx-admin" element={<ProtectedRoute token={token}><AdminPanel {...sharedProps} /></ProtectedRoute>} />
          <Route path="/mod-bot" element={<ProtectedRoute token={token}><ModeratorBot {...sharedProps} /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute token={token}><Games {...sharedProps} /></ProtectedRoute>} />
          <Route path="/game/create" element={<ProtectedRoute token={token}><Games {...sharedProps} /></ProtectedRoute>} />
          <Route path="/game/join" element={<ProtectedRoute token={token}><Games {...sharedProps} /></ProtectedRoute>} />
          <Route path="/game/join/:inviteCode" element={<ProtectedRoute token={token}><Games {...sharedProps} /></ProtectedRoute>} />
          <Route path="/game/room/:roomId" element={<ProtectedRoute token={token}><Games {...sharedProps} /></ProtectedRoute>} />
          <Route path="/supa/payment-callback" element={<ProtectedRoute token={token}><SupaPaymentCallback /></ProtectedRoute>} />
          <Route path="/u/:slug" element={<SlugRedirect />} />
          <Route path="/post/:postId/quotes" element={<ProtectedRoute token={token}><PostQuotes {...sharedProps} /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
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
