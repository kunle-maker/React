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
import API from './utils/api';
import socket from './utils/socket';

function ProtectedRoute({ children, token }) {
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
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
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setCurrentUser(null);
      }
    }
  }, []);

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

  const sharedProps = { currentUser, unreadCounts };

  return (
    <HashRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
