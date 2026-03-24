import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiUsers, FiSearch, FiUser, FiSettings, FiLogOut, FiZap, FiPlusSquare, FiBell, FiX } from 'react-icons/fi';
import { HiHome, HiChatAlt2, HiUsers, HiBell } from 'react-icons/hi';
import Avatar from './Avatar';
import { useI18n } from '../contexts/I18nContext';

function VLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#5865f2"/>
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

const POPUP_ITEMS = [
  { path: '/search',        icon: FiSearch,    label: 'Search',        badgeKey: null },
  { path: '/create',        icon: FiPlusSquare,label: 'Create',        badgeKey: null },
  { path: '/notifications', icon: FiBell,      label: 'Notifications', badgeKey: 'notifications', activeIcon: HiBell },
  { path: '/ai',            icon: FiZap,       label: 'AI',            badgeKey: null },
];

export default function Layout({ children, currentUser, unreadCounts = {}, contentClass = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);
  const vboxRef = useRef(null);

  const ALL_NAV_ITEMS = [
    { path: '/',             icon: FiHome,          activeIcon: HiHome,    label: t.home || 'Home' },
    { path: '/search',       icon: FiSearch,                               label: t.search || 'Search' },
    { path: '/create',       icon: FiPlusSquare,                           label: t.post || 'Create' },
    { path: '/notifications',icon: FiBell,          activeIcon: HiBell,    label: t.notifications || 'Notifications', badgeKey: 'notifications' },
    { path: '/messages',     icon: FiMessageSquare, activeIcon: HiChatAlt2,label: t.messages || 'Messages', badgeKey: 'messages' },
    { path: '/groups',       icon: FiUsers,         activeIcon: HiUsers,   label: t.group || 'Groups', badgeKey: 'groups' },
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

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <nav className="desktop-sidebar flex-col items-center py-3 gap-2 discord-sidebar border-r border-discord-darker z-20">
        <Link to="/" className="mb-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl hover:rounded-xl transition-all duration-200 hover:bg-discord-brand/20">
            <VLogo size={32} />
          </div>
        </Link>
        <div className="w-8 h-0.5 bg-discord-hover my-1 rounded" />
        {ALL_NAV_ITEMS.map(item => {
          const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
          const active = isActive(item.path);
          const badge = item.badgeKey ? (unreadCounts[item.badgeKey] || 0) : 0;
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
                    <FiUser size={14} /> {t.profile || 'Profile'}
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-discord-text hover:bg-discord-hover transition-colors" onClick={() => setShowUserMenu(false)}>
                    <FiSettings size={14} /> {t.settings || 'Settings'}
                  </Link>
                  <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors" onClick={handleLogout}>
                    <FiLogOut size={14} /> {t.logout || 'Log Out'}
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

      {/* Mobile: Popup menu */}
      {showPopup && (
        <div className="mobile-nav-popup" ref={popupRef}>
          <div className="mobile-popup-grid">
            {POPUP_ITEMS.map(item => {
              const Icon = isActive(item.path) && item.activeIcon ? item.activeIcon : item.icon;
              const active = isActive(item.path);
              const badge = item.badgeKey ? (unreadCounts[item.badgeKey] || 0) : 0;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-popup-item ${active ? 'active' : ''}`}
                  onClick={() => setShowPopup(false)}
                >
                  <div className="mobile-popup-icon">
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

      {/* Mobile Floating Pill Nav — 5 items: Home | Messages | V | Groups | Profile */}
      <nav className="mobile-pill-nav">
        {/* Home */}
        <Link
          to="/"
          className={`mobile-pill-item ${location.pathname === '/' ? 'active' : ''}`}
          aria-label="Home"
        >
          {location.pathname === '/' ? <HiHome size={23} /> : <FiHome size={22} />}
          {location.pathname === '/' && <span className="mobile-pill-label">Home</span>}
        </Link>

        {/* Messages */}
        <Link
          to="/messages"
          className={`mobile-pill-item ${isActive('/messages') ? 'active' : ''}`}
          aria-label="Messages"
        >
          {isActive('/messages') ? <HiChatAlt2 size={23} /> : <FiMessageSquare size={22} />}
          {isActive('/messages') && <span className="mobile-pill-label">Messages</span>}
          {(unreadCounts.messages || 0) > 0 && (
            <span className="badge absolute -top-1 -right-0.5 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
              {unreadCounts.messages > 99 ? '99+' : unreadCounts.messages}
            </span>
          )}
        </Link>

        {/* VesselX Blue Box — center action hub */}
        <div className="mobile-pill-vbox-wrap">
          <button
            ref={vboxRef}
            className={`mobile-pill-vbox ${showPopup ? 'open' : ''} ${isPopupRouteActive && !showPopup ? 'route-active' : ''}`}
            onClick={() => {
              setShowPopup(p => !p);
              if (navigator.vibrate) navigator.vibrate(10);
            }}
            aria-label="More"
          >
            {showPopup ? (
              <FiX size={17} className="text-white" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                  <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
                </svg>
                {popupBadge > 0 && (
                  <span className="badge absolute -top-1 -right-1 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
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
          className={`mobile-pill-item ${isActive('/groups') ? 'active' : ''}`}
          aria-label="Groups"
        >
          {isActive('/groups') ? <HiUsers size={23} /> : <FiUsers size={22} />}
          {isActive('/groups') && <span className="mobile-pill-label">Groups</span>}
          {(unreadCounts.groups || 0) > 0 && (
            <span className="badge absolute -top-1 -right-0.5 text-[8px] min-w-[13px] h-3 flex items-center justify-center px-0.5">
              {unreadCounts.groups > 99 ? '99+' : unreadCounts.groups}
            </span>
          )}
        </Link>

        {/* Profile */}
        {currentUser && (
          <Link
            to={`/profile/${currentUser.username}`}
            className={`mobile-pill-item ${isActive(`/profile/${currentUser.username}`) ? 'active' : ''}`}
            aria-label="Profile"
          >
            <Avatar user={currentUser} size={23} />
            {isActive(`/profile/${currentUser.username}`) && <span className="mobile-pill-label">Profile</span>}
          </Link>
        )}
      </nav>
    </div>
  );
}
