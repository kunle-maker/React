import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';

export default function Notifications({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await API.getNotifications();
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await API.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { }
  };

  const getIcon = (type) => {
    const icons = { like: '❤️', comment: '💬', follow: '👤', mention: '💬', reaction: '😊', group: '👥' };
    return icons[type] || '🔔';
  };

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-discord-text">Notifications</h1>
          {notifications.some(n => !n.read) && (
            <button
              className="flex items-center gap-1 text-discord-brand text-sm hover:underline"
              onClick={markAllRead}
            >
              <FiCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <FiBell size={40} className="text-discord-muted mx-auto mb-3" />
            <p className="text-discord-text font-semibold">All caught up!</p>
            <p className="text-discord-muted text-sm mt-1">No new notifications.</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => (
              <div
                key={n._id || i}
                className={`flex gap-3 px-4 py-3 border-b border-discord-hover cursor-pointer transition-colors ${n.read ? 'hover:bg-discord-hover' : 'bg-discord-mention/30 hover:bg-discord-mention/50'}`}
                onClick={() => {
                  if (n.postId) navigate(`/post/${n.postId}`);
                  else if (n.fromUser) navigate(`/profile/${n.fromUser.username || n.fromUser}`);
                }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={n.fromUser || { username: 'User' }} size={44} />
                  <span className="absolute -bottom-1 -right-1 text-base">{getIcon(n.type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-discord-text text-sm leading-relaxed">
                    <span className="font-semibold">{n.fromUser?.name || n.fromUser?.username || 'Someone'}</span>
                    {' '}{n.message || n.text || `${n.type}d your post`}
                  </p>
                  {n.content && (
                    <p className="text-discord-muted text-xs mt-0.5 truncate">{n.content}</p>
                  )}
                  <p className="text-discord-muted text-xs mt-1">
                    {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-discord-brand rounded-full mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
