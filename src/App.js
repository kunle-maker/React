import React from 'react';
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

// Video initialization helper
const initializeVideos = () => {
  setTimeout(() => {
    document.querySelectorAll('video').forEach(video => {
      if (!video.hasAttribute('playsinline')) {
        video.setAttribute('playsinline', '');
      }
      if (!video.hasAttribute('preload')) {
        video.setAttribute('preload', 'metadata');
      }
      video.muted = true;
      video.addEventListener('loadedmetadata', () => {
        console.log('Video ready:', video.src);
      });      
      video.addEventListener('error', (e) => {
        console.error('Video error:', e.target.error);
      });
      if (video.getBoundingClientRect().top < window.innerHeight && 
          video.getBoundingClientRect().bottom > 0) {
        video.play().catch(e => {
          console.log("Initial autoplay prevented:", e);
        });
      }
    });
  }, 500);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(!!localStorage.getItem('token'));
  const [theme, setTheme] = React.useState(localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key || e.key === 'token') {
        setIsAuthenticated(!!localStorage.getItem('token'));
      }
      if (!e.key || e.key === 'theme') {
        setTheme(localStorage.getItem('theme') || 'dark');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleStorageChange);
    window.addEventListener('themeChange', () => {
      setTheme(localStorage.getItem('theme') || 'dark');
    });
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
      observer.disconnect();
    };
  }, []);

  React.useEffect(() => {
    const handleGlobalError = (event) => {
      console.error('Global error:', event.error);
      if (event.error?.message?.includes('The element has no supported sources')) {
        console.log('Caught video source error - this is expected and handled');
        event.preventDefault();
      }
    };
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (event.reason?.message?.includes('The element has no supported sources')) {
        console.log('Caught video source error from promise - this is expected and handled');
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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
            isAuthenticated ? <Messages /> : <Navigate to="/login" />
          } />
          <Route path="/groups" element={
            isAuthenticated ? <Groups /> : <Navigate to="/login" />
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
      </div>
    </Router>
  );
}

export default App;