import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSun, FiMoon, FiUsers, FiUserPlus } from 'react-icons/fi';
import API from '../utils/api';

const Sidebar = ({ currentUser }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new Event('themeChange'));
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await API.searchUsers('');
        setSuggestions(data.users?.slice(0, 5) || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    fetchSuggestions();
  }, []);

  return (
    <div className="sidebar">
      <div className="current-user-card">
        <Link to={`/profile/${currentUser?.username}`}>
          <img
            src={currentUser?.profilePicture || `https://ui-avatars.com/api/?name=${currentUser?.name || currentUser?.username || 'User'}&background=random`}
            alt={currentUser?.username}
            className="user-avatar"
          />
        </Link>
        <div className="current-user-info">
          <Link to={`/profile/${currentUser?.username}`} className="current-username">
            {currentUser?.username}
          </Link>
          <div className="current-name">{currentUser?.name}</div>
        </div>
      </div>

      {/* Theme Toggle Card */}
      <div className="theme-toggle-card">
        <div className="theme-toggle-header">
          <span>Appearance</span>
          <button 
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <>
                <FiSun size={16} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <FiMoon size={16} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
        <div className="theme-toggle-description">
          {theme === 'dark' 
            ? 'Switch to light mode for daytime browsing'
            : 'Switch to dark mode for nighttime browsing'
          }
        </div>
      </div>

      <div className="suggestions-box">
        <div className="suggestions-header">
          <span className="suggestions-title">Suggestions For You</span>
          <Link to="/search" className="see-all-btn">See All</Link>
        </div>
        
        <div className="suggestions-list">
          {suggestions.map((user) => (
            <div key={user._id} className="suggestion-item">
              <Link to={`/profile/${user.username}`}>
                <img
                  src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.name || user.username}&background=random`}
                  alt={user.username}
                  className="user-avatar"
                />
              </Link>
              <div className="suggestion-info">
                <Link to={`/profile/${user.username}`} className="suggestion-username">
                  {user.username}
                </Link>
                <div className="suggestion-name">{user.name}</div>
              </div>
              <button className="follow-btn">Follow</button>
            </div>
          ))}
        </div>
      </div>

      <div className="footer">
        <div className="footer-links">
          <a href="#" className="footer-link">About</a>
          <a href="#" className="footer-link">Help</a>
          <a href="#" className="footer-link">Press</a>
          <a href="#" className="footer-link">API</a>
          <a href="#" className="footer-link">Jobs</a>
          <a href="#" className="footer-link">Privacy</a>
          <a href="#" className="footer-link">Terms</a>
        </div>
        <p>&copy; 2025 Vesselx by Ayokunle</p>
      </div>
    </div>
  );
};

export default Sidebar;