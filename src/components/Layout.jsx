import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiUsers, FiBell, FiSearch, FiUser, FiSettings, FiLogOut, FiZap, FiPlusSquare } from 'react-icons/fi';
import { HiHome, HiChatAlt2, HiUsers, HiBell } from 'react-icons/hi';
import Avatar from './Avatar';
import API from '../utils/api';

function VLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#5865f2"/>
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

const NAV_ITEMS = [
  { path: '/', icon: FiHome, activeIcon: HiHome, label: 'Home' },
  { path: '/search', icon: FiSearch, label: 'Search' },
  { path: '/create', icon: FiPlusSquare, label: 'Create' },
  { path: '/messages', icon: FiMessageSquare, activeIcon: HiChatAlt2, label: 'Messages' },
  { path: '/groups', icon: FiUsers, activeIcon: HiUsers, label: 'Groups' },
  { path: '/ai', icon: FiZap, label: 'AI' },
];

export default function Layout({ children, currentUser, unreadCounts = {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <nav className="desktop-sidebar flex-col items-center py-3 gap-2 discord-sidebar border-r border-discord-darker z-20">
        <Link to="/" className="mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl hover:rounded-xl transition-all duration-200 hover:bg-discord-brand/20">
            <VLogo size={32} />
          </div>
        </Link>
        <div className="w-8 h-0.5 bg-discord-hover my-1 rounded" />
        {NAV_ITEMS.map(item => {
          const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
          const active = isActive(item.path);
          const badge = item.path === '/messages' ? unreadCounts.messages : item.path === '/groups' ? unreadCounts.groups : 0;
          return (
            <div key={item.path} className="relative tooltip" data-tip={item.label}>
              <Link
                to={item.path}
                className={`relative w-12 h-12 flex items-center justify-center rounded-2xl hover:rounded-xl transition-all duration-200 ${active ? 'bg-discord-brand text-white rounded-xl' : 'text-discord-channel hover:text-white hover:bg-discord-brand/20'}`}
              >
                <Icon size={22} />
                {badge > 0 && (
                  <span className="badge absolute -top-1 -right-1 text-[10px] min-w-[16px] h-4 flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1 h-8 bg-white rounded-r-full" />
              )}
            </div>
          );
        })}
        <div className="mt-auto">
          {currentUser && (
            <div className="relative">
              <button
                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:rounded-xl hover:bg-discord-hover transition-all"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar user={currentUser} size={32} showStatus />
              </button>
              {showUserMenu && (
                <div className="absolute left-full bottom-0 ml-2 bg-discord-dark border border-discord-hover rounded-lg shadow-2xl py-1 min-w-48 z-50">
                  <div className="px-3 py-2 border-b border-discord-hover">
                    <div className="font-semibold text-discord-text text-sm">{currentUser.name}</div>
                    <div className="text-discord-muted text-xs">@{currentUser.username}</div>
                  </div>
                  <Link to={`/profile/${currentUser.username}`} className="flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-hover transition-colors" onClick={() => setShowUserMenu(false)}>
                    <FiUser size={14} /> Profile
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-hover transition-colors" onClick={() => setShowUserMenu(false)}>
                    <FiSettings size={14} /> Settings
                  </Link>
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors" onClick={handleLogout}>
                    <FiLogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden discord-main">
        <div className="flex-1 overflow-y-auto scrollable">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 py-2 z-30">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
          const active = isActive(item.path);
          const badge = item.path === '/messages' ? unreadCounts.messages : item.path === '/groups' ? unreadCounts.groups : 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${active ? 'text-discord-brand' : 'text-discord-muted'}`}
            >
              <Icon size={22} />
              <span className="text-[10px]">{item.label}</span>
              {badge > 0 && (
                <span className="badge absolute -top-1 right-0 text-[9px] min-w-[14px] h-3.5 flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
        {currentUser && (
          <Link
            to={`/profile/${currentUser.username}`}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${isActive(`/profile/${currentUser.username}`) ? 'text-discord-brand' : 'text-discord-muted'}`}
          >
            <Avatar user={currentUser} size={22} />
            <span className="text-[10px]">You</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
