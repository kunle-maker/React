import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const Sidebar = ({ currentUser }) => {
  const [suggestions, setSuggestions] = useState([]);

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
            src={currentUser?.profilePicture || '/default-avatar.png'}
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

      <div className="suggestions-box">
        <div className="suggestions-header">
          <span className="suggestions-title">Suggestions For You</span>
          <button className="see-all-btn">See All</button>
        </div>
        
        <div className="suggestions-list">
          {suggestions.map((user) => (
            <div key={user._id} className="suggestion-item">
              <Link to={`/profile/${user.username}`}>
                <img
                  src={user.profilePicture || '/default-avatar.png'}
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