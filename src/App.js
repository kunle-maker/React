import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import notificationManager from './utils/notifications';
import socketManager from './utils/socket';
import API from './utils/api';
import PageLoader from './components/PageLoader';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Feed = lazy(() => import('./pages/Feed'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Messages = lazy(() => import('./pages/Messages'));
const Groups = lazy(() => import('./pages/Groups'));
const JoinGroup = lazy(() => import('./pages/JoinGroup'));
const GroupChat = lazy(() => import('./pages/GroupChat'));
const Search = lazy(() => import('./pages/Search'));
const Notifications = lazy(() => import('./pages/Notifications'));
const FullPostView = lazy(() => import('./pages/FullPostView'));
const About = lazy(() => import('./pages/About'));
const Help = lazy(() => import('./pages/Help'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

// Keep the video initialisation helper unchanged
const initializeVideos = () => {
  setTimeout(() => {
    document.querySelectorAll('video').forEach(video => {
      if (!video.hasAttribute('playsinline')) {
        video.setAttribute('playsinline', '');
      }
      if (!video.hasAttribute('preload')) {
        video.setAttribute('preload', 'metadata');
      }     
      video.addEventListener('loadedmetadata', () => {
        console.log('Video ready:', video.src);
      });      
      video.addEventListener('error', (e) => {
        console.error('Video error:', e.target.error);
      });
    });
  }, 500);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    notifications: 0,
    groups: 0
  });

  // Quick auth check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'token') {
        const authenticated = !!localStorage.getItem('token');
        setIsAuthenticated(authenticated);
        if (authenticated) {
          // Delay socket connection to prioritize UI rendering
          setTimeout(() => {
            setupUserConnection();
          }, 2000);
        } else {
          socketManager.disconnect();
        }
      }
      if (!e.key || e.key === 'theme') {
        setTheme(localStorage.getItem('theme') || 'dark');
      }
    };
    
    if (isAuthenticated) {
      // Delay socket connection
      setTimeout(() => {
        setupUserConnection();
      }, 2000);
    }
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleStorageChange);
    window.addEventListener('themeChange', () => {
      setTheme(localStorage.getItem('theme') || 'dark');
    });
    
    window.addEventListener('unreadCountUpdate', handleUnreadCountUpdate);    
    initializeVideos();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          initializeVideos();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleStorageChange);
      window.removeEventListener('themeChange', () => {});
      window.removeEventListener('unreadCountUpdate', handleUnreadCountUpdate);
      observer.disconnect();
      socketManager.disconnect();
    };
  }, [isAuthenticated]);

  const setupUserConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (user && token) {
        socketManager.connect(user._id || user.id, token);
        await notificationManager.initialize();
        notificationManager.setExternalUserId(user._id || user.id);
        fetchUnreadCounts();
      }
    } catch (error) {
      console.error('Setup user connection error:', error);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const conversations = await API.getConversations();
      const messageUnread = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
      const groups = await API.getGroups();
      const groupUnread = groups.reduce((total, group) => total + (group.unreadCount || 0), 0);      
      setUnreadCounts({
        messages: messageUnread,
        groups: groupUnread,
        notifications: 0
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const handleUnreadCountUpdate = (event) => {
    const { type, increment } = event.detail;
    setUnreadCounts(prev => ({
      ...prev,
      [type]: Math.max(0, (prev[type] || 0) + increment)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl font-bold text-white tracking-tight">VesselX</span>
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.7)] animate-pulse"></div>
          </div>
          <div className="loading-spinner mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" replace /> : <Login />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/" replace /> : <Register />
            } />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              isAuthenticated ? <Feed /> : <Navigate to="/login" replace />
            } />
            <Route path="/post/:postId" element={
              isAuthenticated ? <FullPostView /> : <Navigate to="/login" />
            } />
            <Route path="/profile/:username" element={
              isAuthenticated ? <Profile /> : <Navigate to="/login" />
            } />
            <Route path="/settings" element={
              isAuthenticated ? <Settings /> : <Navigate to="/login" />
            } />
            <Route path="/ai" element={
              isAuthenticated ? <AIAssistant /> : <Navigate to="/login" />
            } />
            <Route path="/messages" element={
              isAuthenticated ? <Messages unreadCounts={unreadCounts} /> : <Navigate to="/login" />
            } />
            <Route path="/messages/:username" element={
              isAuthenticated ? <Messages unreadCounts={unreadCounts} /> : <Navigate to="/login" />
            } />
            <Route path="/groups" element={
              isAuthenticated ? <Groups unreadCounts={unreadCounts} /> : <Navigate to="/login" />
            } />
            <Route path="/groups/:groupId" element={
              isAuthenticated ? <GroupChat /> : <Navigate to="/login" />
            } />
            <Route path="/join/:inviteCode" element={
              isAuthenticated ? <JoinGroup /> : <Navigate to="/login" />
            } />
            <Route path="/notifications" element={
              isAuthenticated ? <Notifications /> : <Navigate to="/login" />
            } />
            <Route path="/search" element={
              isAuthenticated ? <Search /> : <Navigate to="/login" />
            } />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;