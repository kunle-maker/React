// Navbar.js - Updated with proper design
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, FiSend, FiSearch, FiUser, FiPlusSquare,
  FiBell, FiMessageSquare, FiUsers
} from 'react-icons/fi';
import API from '../utils/api';

const Navbar = ({ user, unreadCounts = { messages: 0, notifications: 0 } }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const data = await API.searchUsers(query);
        setSearchResults(data.users || []);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="nav-content">
          <Link to="/" className="logo">
            <span className="logo-text">VesselX</span>
            <div className="logo-dot"></div>
          </Link>

          {user && (
            <div className="nav-search">
              <FiSearch size={16} />
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
                      onClick={() => setSearchQuery('')}
                    >
                      <img
                        src={result.profilePicture || '/default-avatar.png'}
                        alt={result.username}
                        className="search-result-avatar"
                      />
                      <div className="search-result-info">
                        <div className="search-result-username">{result.username}</div>
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
                  className="nav-action-btn"
                  onClick={() => navigate('/')}
                  title="Home"
                >
                  <FiHome size={24} />
                </button>
                
                <button 
                  className="nav-action-btn"
                  onClick={() => navigate('/messages')}
                  title="Messages"
                >
                  <FiSend size={24} />
                  {unreadCounts.messages > 0 && (
                    <span className="notification-badge">{unreadCounts.messages}</span>
                  )}
                </button>
                
                <button 
                  className="nav-action-btn"
                  onClick={() => navigate('/ai')}
                  title="AI Assistant"
                >
                  <FiMessageSquare size={24} />
                </button>
                
                <button 
                  className="nav-action-btn"
                  onClick={() => navigate('/groups')}
                  title="Groups"
                >
                  <FiUsers size={24} />
                </button>
                
                <button 
                  className="nav-action-btn"
                  onClick={() => navigate('/profile/' + user.username)}
                  title="Profile"
                >
                  <img
                    src={user.profilePicture || '/default-avatar.png'}
                    alt={user.username}
                    className="user-nav-avatar"
                  />
                </button>
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

      {user && (
        <div className="bottom-nav">
          <Link 
            to="/" 
            className="nav-item"
          >
            <FiHome size={24} />
            <span>Home</span>
          </Link>
          
          <Link 
            to="/search" 
            className="nav-item"
          >
            <FiSearch size={24} />
            <span>Search</span>
          </Link>
          
          <div 
            className="center-nav-btn"
            onClick={() => {/* Handle create post */}}
          >
            <FiPlusSquare size={24} color="#0095f6" />
          </div>
          
          <Link 
            to="/messages" 
            className="nav-item"
          >
            <FiSend size={24} />
            <span>Messages</span>
          </Link>
          
          <Link 
            to={`/profile/${user.username}`}
            className="nav-item"
          >
            <img
              src={user.profilePicture || '/default-avatar.png'}
              alt={user.username}
              className="user-nav-avatar-small"
            />
          </Link>
        </div>
      )}
    </>
  );
};

export default Navbar;