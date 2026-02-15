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
import GroupChat from './pages/GroupChat';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import FullPostView from './pages/FullPostView';
import notificationManager from './utils/notifications';
import socketManager from './utils/socket';
import API from './utils/api';

// Video initialization helper – now does NOT force mute
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
  const [notificationPermission, setNotificationPermission] = useState(Notification?.permission || 'default');
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
        
        // Setup socket and notifications when user logs in
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
    
    // Initial setup if authenticated
    if (isAuthenticated) {
      setupUserConnection();
    }
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleStorageChange);
    window.addEventListener('themeChange', () => {
      setTheme(localStorage.getItem('theme') || 'dark');
    });
    
    // Listen for unread count updates from socket
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
        // Connect to socket
        socketManager.connect(user._id || user.id, token);
        
        // Initialize notifications
        await notificationManager.initialize();
        
        // Check notification permission
        if (Notification.permission === 'granted') {
          setNotificationPermission('granted');
          
          // Check if already subscribed
          setTimeout(async () => {
            try {
              const subscription = await notificationManager.swRegistration?.pushManager.getSubscription();
              if (!subscription && Notification.permission === 'granted') {
                // Auto-subscribe if not already subscribed
                await notificationManager.subscribeToPush();
              }
            } catch (error) {
              console.log('Subscription check error:', error);
            }
          }, 3000);
        } else if (Notification.permission === 'default') {
          // Prompt for notification permission after a delay
          setTimeout(() => {
            notificationManager.requestPermission().then(granted => {
              if (granted) {
                setNotificationPermission('granted');
                notificationManager.subscribeToPush();
              }
            });
          }, 5000);
        }
        
        // Fetch unread counts
        fetchUnreadCounts();
      }
    } catch (error) {
      console.error('Setup user connection error:', error);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      // Fetch conversations for unread message count
      const conversations = await API.getConversations();
      const messageUnread = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
      
      // Fetch groups for unread group message count
      const groups = await API.getGroups();
      const groupUnread = groups.reduce((total, group) => total + (group.unreadCount || 0), 0);
      
      setUnreadCounts({
        messages: messageUnread,
        groups: groupUnread,
        notifications: 0 // You can implement this if you have a notifications system
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

  // Handle notification clicks when app is in foreground
  useEffect(() => {
    const handleNotificationClick = (event) => {
      // This is handled by service worker, but we can also handle when app is open
      console.log('Notification clicked in app:', event);
    };

    navigator.serviceWorker?.addEventListener('notificationclick', handleNotificationClick);

    return () => {
      navigator.serviceWorker?.removeEventListener('notificationclick', handleNotificationClick);
    };
  }, []);

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Register />
          } />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
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
          <Route path="/notifications" element={
            isAuthenticated ? <Notifications /> : <Navigate to="/login" />
          } />
          <Route path="/search" element={
            isAuthenticated ? <Search /> : <Navigate to="/login" />
          } />
        </Routes>
        
        {/* Notification permission prompt (only show if not decided) */}
        {isAuthenticated && notificationPermission === 'default' && (
          <div className="notification-permission-prompt">
            <div className="prompt-content">
              <div className="prompt-icon">🔔</div>
              <div className="prompt-text">
                <h4>Stay Updated</h4>
                <p>Get notified when you receive messages and group activity</p>
              </div>
              <div className="prompt-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setNotificationPermission('denied')}
                >
                  Not Now
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    const granted = await notificationManager.requestPermission();
                    if (granted) {
                      setNotificationPermission('granted');
                      await notificationManager.subscribeToPush();
                    }
                  }}
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;