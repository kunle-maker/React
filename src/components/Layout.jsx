import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiUsers, FiSearch, FiUser, FiSettings, FiLogOut, FiZap, FiPlusSquare, FiBell, FiX } from 'react-icons/fi';
import { HiHome, HiChatAlt2, HiUsers, HiBell } from 'react-icons/hi';
import { MdGames } from 'react-icons/md';
import Avatar from './Avatar';
import { useI18n } from '../contexts/I18nContext';

function VLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
      <defs>
        <linearGradient id="vLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="28" fill="url(#vLogoGradient)"/>
      <path d="M30 30L50 70L70 30" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const POPUP_ITEMS = [
  { path: '/search',        icon: FiSearch,    label: 'Search',        badgeKey: null },
  { path: '/create',        icon: FiPlusSquare,label: 'Create',        badgeKey: null },
  { path: '/notifications', icon: FiBell,      label: 'Notifications', badgeKey: 'notifications', activeIcon: HiBell },
  { path: '/game',         icon: MdGames,     label: 'Games',         badgeKey: null },
  { path: '/ai',            icon: FiZap,       label: 'AI',            badgeKey: null },
  { path: '/settings',      icon: FiSettings,  label: 'Settings',      badgeKey: null },
];

export default function Layout({ children, currentUser, unreadCounts = {}, contentClass = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const popupRef = useRef(null);
  const vboxRef = useRef(null);

  const ALL_NAV_ITEMS = [
    { path: '/',             icon: FiHome,          activeIcon: HiHome,    label: t.home || 'Home' },
    { path: '/search',       icon: FiSearch,                               label: t.search || 'Search' },
    { path: '/create',       icon: FiPlusSquare,                           label: t.post || 'Create' },
    { path: '/notifications',icon: FiBell,          activeIcon: HiBell,    label: t.notifications || 'Notifications', badgeKey: 'notifications' },
    { path: '/messages',     icon: FiMessageSquare, activeIcon: HiChatAlt2,label: t.messages || 'Messages', badgeKey: 'messages' },
    { path: '/groups',       icon: FiUsers,         activeIcon: HiUsers,   label: t.group || 'Groups', badgeKey: 'groups' },
    { path: '/game',        icon: MdGames,                                label: 'Games' },
    { path: '/ai',           icon: FiZap,                                  label: t.ai || 'AI' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const popupBadge = (unreadCounts.notifications || 0);
  const isPopupRouteActive = POPUP_ITEMS.some(item => isActive(item.path));

  useEffect(() => {
    if (!showPopup) return;
    const handleKey = (e) => { if (e.key === 'Escape') setShowPopup(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPopup]);

  useEffect(() => {
    if (!showPopup) return;
    const handleOutside = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (vboxRef.current?.contains(e.target)) return;
      setShowPopup(false);
    };
    document.addEventListener('pointerdown', handleOutside, { capture: true });
    return () => document.removeEventListener('pointerdown', handleOutside, { capture: true });
  }, [showPopup]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarExpanded(!isSidebarExpanded);

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <nav 
        className={`desktop-sidebar flex-col items-center py-4 gap-2 discord-sidebar border-r border-discord-darker z-20 ${isSidebarExpanded ? 'expanded px-4' : 'px-2'}`}
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <Link to="/" className="mb-4" aria-label="Home">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl hover:rounded-xl transition-all duration-300 hover:bg-brand-primary/20">
            <VLogo size={36} />
          </div>
        </Link>
        <div className="w-8 h-0.5 bg-discord-hover my-2 rounded opacity-50" />
        {ALL_NAV_ITEMS.map(item => {
          const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
          const active = isActive(item.path);
          const badge = item.badgeKey ? (unreadCounts[item.badgeKey] || 0) : 0;
          return (
            <div key={item.path} className="relative w-full">
              <Link
                to={item.path}
                aria-label={item.label}
                className={`relative w-full h-12 flex items-center ${isSidebarExpanded ? 'justify-start px-3 gap-3' : 'justify-center'} rounded-2xl hover:rounded-xl transition-all duration-200 ${active ? 'bg-brand-primary text-white rounded-xl shadow-lg' : 'text-discord-channel hover:text-white hover:bg-brand-primary/10'}`}
              >
                <Icon size={22} className="flex-shrink-0" />
                {isSidebarExpanded && (
                  <span className="font-semibold text-sm truncate animate-fade-in">{item.label}</span>
                )}
                {badge > 0 && (
                  <span className={`badge absolute ${isSidebarExpanded ? 'right-2' : '-top-1 -right-1'} text-[10px] min-w-[16px] h-4 flex items-center justify-center`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
              {active && !isSidebarExpanded && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1 h-8 bg-brand-primary rounded-r-full" />
              )}
            </div>
          );
        })}
        <div className="mt-auto w-full">
          {currentUser && (
            <div className="relative w-full">
              <button
                aria-label="User Menu"
                className={`w-full h-12 flex items-center ${isSidebarExpanded ? 'justify-start px-3 gap-3' : 'justify-center'} rounded-2xl hover:rounded-xl hover:bg-discord-hover transition-all`}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar user={currentUser} size={32} showStatus />
                {isSidebarExpanded && (
                  <div className="flex flex-col items-start min-w-0 animate-fade-in">
                    <span className="text-xs font-bold text-discord-text truncate w-full text-left">{currentUser.name}</span>
                    <span className="text-[10px] text-discord-muted truncate w-full text-left">@{currentUser.username}</span>
                  </div>
                )}
              </button>
              {showUserMenu && (
                <div className={`absolute ${isSidebarExpanded ? 'left-0 bottom-full mb-2' : 'left-full bottom-0 ml-2'} bg-discord-dark border border-discord-hover rounded-xl shadow-2xl py-2 min-w-48 z-50 glass-card animate-slide-up`}>
                  <div className="px-4 py-2 border-b border-discord-hover mb-1">
                    <div className="font-bold text-discord-text text-sm truncate">{currentUser.name}</div>
                    <div className="text-discord-muted text-xs">@{currentUser.username}</div>
                  </div>
                  <Link to={`/profile/${currentUser.username}`} className="flex items-center gap-3 px-4 py-2 text-sm text-discord-text hover:bg-brand-primary/10 hover:text-brand-primary transition-colors" onClick={() => setShowUserMenu(false)}>
                    <FiUser size={16} /> {t.profile || 'Profile'}
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-discord-text hover:bg-brand-primary/10 hover:text-brand-primary transition-colors" onClick={() => setShowUserMenu(false)}>
                    <FiSettings size={16} /> {t.settings || 'Settings'}
                  </Link>
                  <div className="h-px bg-discord-hover my-1 mx-2" />
                  <button className="flex items-center gap-3 w-full px-4 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors" onClick={handleLogout}>
                    <FiLogOut size={16} /> {t.logout || 'Log Out'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden discord-main">
        <div className={`flex-1 overflow-hidden ${contentClass || 'overflow-y-auto scrollable mobile-content-pad'}`}>
          {children}
        </div>
      </main>

      {/* Mobile: Popup menu (FAB Grid) */}
      {showPopup && (
        <div className="mobile-nav-popup glass-card" ref={popupRef}>
          <div className="fab-circular-grid">
            {POPUP_ITEMS.map(item => {
              const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
              const active = isActive(item.path);
              const badge = item.badgeKey ? (unreadCounts[item.badgeKey] || 0) : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`mobile-popup-item ${active ? 'active' : ''}`}
                  onClick={() => setShowPopup(false)}
                >
                  <div className="mobile-popup-icon shadow-inner">
                    <Icon size={20} />
                    {badge > 0 && (
                      <span className="badge absolute -top-1 -right-1 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="mobile-popup-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Floating Pill Nav — 5 items: Home | Messages | FAB | Groups | Profile */}
      <nav className="mobile-pill-nav">
        {/* Home */}
        <Link
          to="/"
          className={`mobile-pill-item ${location.pathname === '/' ? 'active text-brand-primary' : ''}`}
          aria-label="Home"
        >
          {location.pathname === '/' ? <HiHome size={24} /> : <FiHome size={22} />}
          {location.pathname === '/' && <span className="mobile-pill-label text-brand-primary">Home</span>}
        </Link>

        {/* Messages */}
        <Link
          to="/messages"
          className={`mobile-pill-item ${isActive('/messages') ? 'active text-brand-primary' : ''}`}
          aria-label="Messages"
        >
          {isActive('/messages') ? <HiChatAlt2 size={24} /> : <FiMessageSquare size={22} />}
          {isActive('/messages') && <span className="mobile-pill-label text-brand-primary">Chat</span>}
          {(unreadCounts.messages || 0) > 0 && (
            <span className="badge absolute top-1 right-2 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
              {unreadCounts.messages > 99 ? '99+' : unreadCounts.messages}
            </span>
          )}
        </Link>

        {/* Action Hub — center FAB */}
        <div className="mobile-pill-vbox-wrap">
          <button
            ref={vboxRef}
            className={`mobile-pill-vbox ${showPopup ? 'open scale-110 rotate-90' : ''} ${isPopupRouteActive && !showPopup ? 'route-active' : ''}`}
            onClick={() => {
              setShowPopup(p => !p);
              if (navigator.vibrate) navigator.vibrate(12);
            }}
            aria-label="Actions"
            aria-expanded={showPopup}
          >
            {showPopup ? (
              <FiX size={20} className="text-white" />
            ) : (
              <>
                <VLogo size={24} />
                {popupBadge > 0 && (
                  <span className="badge absolute -top-1 -right-1 text-[8px] min-w-[14px] h-3.5 flex items-center justify-center px-0.5 border border-brand-primary">
                    {popupBadge > 99 ? '99+' : popupBadge}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Groups */}
        <Link
          to="/groups"
          className={`mobile-pill-item ${isActive('/groups') ? 'active text-brand-primary' : ''}`}
          aria-label="Groups"
        >
          {isActive('/groups') ? <HiUsers size={24} /> : <FiUsers size={22} />}
          {isActive('/groups') && <span className="mobile-pill-label text-brand-primary">Groups</span>}
          {(unreadCounts.groups || 0) > 0 && (
            <span className="badge absolute top-1 right-2 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
              {unreadCounts.groups > 99 ? '99+' : unreadCounts.groups}
            </span>
          )}
        </Link>

        {/* Profile */}
        {currentUser && (
          <Link
            to={`/profile/${currentUser.username}`}
            className={`mobile-pill-item ${isActive(`/profile/${currentUser.username}`) ? 'active ring-2 ring-brand-primary/30' : ''}`}
            aria-label="Profile"
          >
            <Avatar user={currentUser} size={24} className={isActive(`/profile/${currentUser.username}`) ? 'opacity-100' : 'opacity-60'} />
            {isActive(`/profile/${currentUser.username}`) && <span className="mobile-pill-label text-brand-primary">Profile</span>}
          </Link>
        )}
      </nav>
    </div>
  );
}
