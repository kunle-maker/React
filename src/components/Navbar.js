import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiHome, FiSend, FiSearch, FiPlusSquare, FiUser,
  FiSettings, FiUsers, FiLogOut, FiBell, FiMessageCircle
} from 'react-icons/fi';
import { IoIosRocket } from 'react-icons/io';

const Navbar = ({ user, unreadCounts = {} }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        <Link to="/" className="logo">
          <IoIosRocket size={28} />
          <span>Vesselx</span>
        </Link>

        <div className="nav-search">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search"
            onFocus={() => navigate('/search')}
          />
        </div>

        <div className="nav-icons">
          <Link to="/" className="nav-icon active" title="Home">
            <FiHome size={24} />
          </Link>
          
          <Link to="/messages" className="nav-icon" title="Messages">
            <FiSend size={24} />
            {unreadCounts.messages > 0 && (
              <span className="badge">{unreadCounts.messages}</span>
            )}
          </Link>
          
          <Link to="/ai" className="nav-icon" title="AI Assistant">
            <FiMessageCircle size={24} />
          </Link>
          
          <Link to="/notifications" className="nav-icon" title="Notifications">
            <FiBell size={24} />
            {unreadCounts.notifications > 0 && (
              <span className="badge">{unreadCounts.notifications}</span>
            )}
          </Link>

          <div className="dropdown">
            <button 
              className="nav-icon"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.username}
                  className="user-avatar"
                />
              ) : (
                <FiUser size={24} />
              )}
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                <Link 
                  to={`/profile/${user?.username}`}
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  <FiUser size={18} />
                  Profile
                </Link>
                <Link 
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  <FiSettings size={18} />
                  Settings
                </Link>
                <Link 
                  to="/groups"
                  className="dropdown-item"
                  onClick={() => setShowDropdown(false)}
                >
                  <FiUsers size={18} />
                  Groups
                </Link>
                <div className="dropdown-divider" />
                <button 
                  className="dropdown-item"
                  onClick={handleLogout}
                >
                  <FiLogOut size={18} />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
