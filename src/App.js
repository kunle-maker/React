import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';
import Messages from './pages/Messages';
import Groups from './pages/Groups';
import JoinGroup from './pages/JoinGroup';
import GroupChat from './pages/GroupChat';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import FullPostView from './pages/FullPostView';
import About from './pages/About';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import notificationManager from './utils/notifications';
import socketManager from './utils/socket';
import API from './utils/api';

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
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    notifications: 0,
    groups: 0
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'token') {
        const authenticated = !!localStorage.getItem('token');
        setIsAuthenticated(authenticated);
        if (authenticated) {
          setupUserConnection();
        } else {
          socketManager.disconnect();
        }
      }
      if (!e.key || e.key === 'theme') {
        setTheme(localStorage.getItem('theme') || 'dark');
      }
    };
    
    if (isAuthenticated) {
      setupUserConnection();
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
        // Initialize OneSignal (it handles its own permission prompt)
        await notificationManager.initialize();
        // Optionally tag user for targeted notifications
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
        notifications: 0 // implement if you have a notification system
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

  return (
    <Router>
      <div className="app">
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
        
        {/* OneSignal will show its own permission prompt – remove the custom banner */}
      </div>
    </Router>
  );
}

export default App;