import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiSend, FiSearch, FiUser, FiPlusSquare,
  FiBell, FiMessageSquare, FiUsers, FiSettings, FiMenu,
  FiSun, FiMoon
} from 'react-icons/fi';
import './Navbar.css';
import API from '../utils/api';

const Navbar = ({ user, unreadCounts = { messages: 0, notifications: 0, groups: 0 } }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    window.dispatchEvent(new Event('themeChange'));
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await API.request('/api/notifications');
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Mock data for demo
      const mockNotifications = [
        { id: 1, type: 'like', username: 'designflow', text: 'liked your post', time: '2m' },
        { id: 2, type: 'follow', username: 'audiocast', text: 'started following you', time: '1h' },
        { id: 3, type: 'comment', username: 'vesselx', text: 'commented on your post', time: '2d' },
      ];
      setNotifications(mockNotifications);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const data = await API.searchUsers(query);
        setSearchResults(data.slice(0, 5) || []);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleCreatePost = () => {
    const event = new CustomEvent('openCreatePostModal');
    window.dispatchEvent(event);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/feed';
    }
    return location.pathname.startsWith(path);
  };

  const markNotificationsAsRead = async () => {
    try {
      await API.request('/api/notifications/read', { method: 'POST' });
      setNotifications([]);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-left">
            <button 
              className="nav-action-btn mobile-menu-btn"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <FiMenu size={24} />
            </button>
            <Link to="/" className="logo">
              <span className="logo-text" style={{ color: 'var(--text-primary)' }}>VesselX</span>
              <div className="logo-dot"></div>
            </Link>
          </div>

          {user && (
            <div className="nav-search">
              <FiSearch size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              />
              
              {showSearch && searchQuery.trim() && searchResults.length > 0 && (
                <div className="search-dropdown">
                  {searchResults.map((result) => (
                    <Link
                      key={result._id}
                      to={`/profile/${result.username}`}
                      className="search-result-item"
                      onClick={() => {
                        setSearchQuery('');
                        setShowSearch(false);
                      }}
                    >
                      <img
                        src={result.profilePicture || '/default-avatar.png'}
                        alt={result.username}
                        className="search-result-avatar"
                      />
                      <div className="search-result-info">
                        <div className="search-result-username">@{result.username}</div>
                        <div className="search-result-name">{result.name}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="nav-actions">
            {user ? (
              <>
                <button 
                  className={`nav-action-btn ${isActive('/') ? 'active' : ''}`}
                  onClick={() => navigate('/')}
                  title="Home"
                >
                  <FiHome size={24} />
                  {isActive('/') && <div className="active-indicator"></div>}
                </button>
                
                <button 
                  className={`nav-action-btn ${isActive('/search') ? 'active' : ''}`}
                  onClick={() => navigate('/search')}
                  title="Search"
                >
                  <FiSearch size={24} />
                  {isActive('/search') && <div className="active-indicator"></div>}
                </button>
                
                <button 
                  className={`nav-action-btn ${isActive('/groups') ? 'active' : ''}`}
                  onClick={() => navigate('/groups')}
                  title="Groups"
                >
                  <FiUsers size={24} />
                  {unreadCounts.groups > 0 && (
                    <span className="notification-badge">{unreadCounts.groups}</span>
                  )}
                  {isActive('/groups') && <div className="active-indicator"></div>}
                </button>
                
                <button 
                  className="nav-action-btn create-post-btn"
                  onClick={handleCreatePost}
                  title="Create Post"
                >
                  <FiPlusSquare size={24} />
                </button>
                
                <button 
                  className={`nav-action-btn ${isActive('/messages') ? 'active' : ''}`}
                  onClick={() => navigate('/messages')}
                  title="Messages"
                >
                  <FiSend size={24} />
                  {unreadCounts.messages > 0 && (
                    <span className="notification-badge">{unreadCounts.messages}</span>
                  )}
                  {isActive('/messages') && <div className="active-indicator"></div>}
                </button>
                
                <div className="nav-action-btn-wrapper">
                  <button 
                    className={`nav-action-btn ${isActive('/ai') ? 'active' : ''}`}
                    onClick={() => navigate('/ai')}
                    title="AI Assistant"
                  >
                    <FiMessageSquare size={24} />
                    {isActive('/ai') && <div className="active-indicator"></div>}
                  </button>
                </div>
                
                <div className="nav-action-btn-wrapper notification-wrapper">
                  <button 
                    className="nav-action-btn"
                    onClick={() => setShowNotifications(!showNotifications)}
                    title="Notifications"
                  >
                    <FiBell size={24} />
                    {notifications.length > 0 && (
                      <span className="notification-badge">{notifications.length}</span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="notifications-dropdown">
                      <div className="notifications-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                          <button 
                            className="mark-read-btn"
                            onClick={markNotificationsAsRead}
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      {notifications.length === 0 ? (
                        <div className="empty-notifications">
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        <div className="notifications-list">
                          {notifications.map((notification) => (
                            <div key={notification.id} className="notification-item">
                              <div className="notification-icon">
                                {notification.type === 'like' && '❤️'}
                                {notification.type === 'follow' && '👤'}
                                {notification.type === 'comment' && '💬'}
                              </div>
                              <div className="notification-content">
                                <span className="notification-username">
                                  @{notification.username}
                                </span>
                                <span className="notification-text">
                                  {notification.text}
                                </span>
                                <span className="notification-time">
                                  {notification.time}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="user-menu-wrapper">
                  <button 
                    className="nav-action-btn user-menu-btn"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    title="Profile"
                  >
                    <img
                      src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.name || user.username}&background=random`}
                      alt={user.username}
                      className="user-nav-avatar"
                    />
                  </button>
                  
                  {showUserMenu && (
                    <div className="user-dropdown">
                      <Link 
                        to={`/profile/${user.username}`}
                        className="user-dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <FiUser size={16} />
                        <span>Profile</span>
                      </Link>
                      <Link 
                        to="/settings"
                        className="user-dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <FiSettings size={16} />
                        <span>Settings</span>
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button 
                        className="user-dropdown-item logout-btn"
                        onClick={handleLogout}
                      >
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-text">Log in</Link>
                <Link to="/register" className="btn btn-primary">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-user-info">
                <img
                  src={user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.name || user?.username}&background=random`}
                  alt={user?.username}
                  className="mobile-user-avatar"
                />
                <div>
                  <div className="mobile-username">@{user?.username}</div>
                  <div className="mobile-name">{user?.name}</div>
                </div>
              </div>
              <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>
                ×
              </button>
            </div>
            <div className="mobile-menu-items">
              <Link to="/" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiHome size={20} />
                <span>Home</span>
              </Link>
              <Link to="/search" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiSearch size={20} />
                <span>Search</span>
              </Link>
              <Link to="/groups" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiUsers size={20} />
                <span>Groups</span>
                {unreadCounts.groups > 0 && (
                  <span className="mobile-menu-badge">{unreadCounts.groups}</span>
                )}
              </Link>
              <Link to="/messages" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiSend size={20} />
                <span>Messages</span>
                {unreadCounts.messages > 0 && (
                  <span className="mobile-menu-badge">{unreadCounts.messages}</span>
                )}
              </Link>
              <Link to="/ai" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiMessageSquare size={20} />
                <span>AI Assistant</span>
              </Link>
              <Link to={`/profile/${user?.username}`} className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiUser size={20} />
                <span>Profile</span>
              </Link>
              <Link to="/settings" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                <FiSettings size={20} />
                <span>Settings</span>
              </Link>
              
              <button className="mobile-menu-item" onClick={toggleTheme}>
                {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button className="mobile-menu-item logout-btn" onClick={handleLogout}>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
             {user && (
        <div className="bottom-nav">          
          <div 
            className="center-nav-btn"
            onClick={handleCreatePost}
          >
            <FiPlusSquare size={24} />
          </div>
        </div>
      )} 
    </>
  );
};

export default Navbar;