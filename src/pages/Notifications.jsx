import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiHeart, FiMessageCircle, FiBookmark, FiUser, FiUsers, FiEye } from 'react-icons/fi';
import { HiHeart } from 'react-icons/hi';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import { parseEmojisToHtml } from '../utils/emoji';

function TypeIcon({ type, reaction }) {
  const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold absolute -bottom-0.5 -right-0.5 border-2 border-discord-bg';
  if (type === 'like')           return <span className={`${base} bg-red-500`}><HiHeart size={10} className="text-white" /></span>;
  if (type === 'comment' || type === 'mention') return <span className={`${base} bg-discord-brand`}><FiMessageCircle size={8} className="text-white" /></span>;
  if (type === 'bookmark')       return <span className={`${base} bg-yellow-500`}><FiBookmark size={8} className="text-white" /></span>;
  if (type === 'follow')         return <span className={`${base} bg-green-500`}><FiUser size={8} className="text-white" /></span>;
  if (type === 'story_view')     return <span className={`${base} bg-purple-500`}><FiEye size={8} className="text-white" /></span>;
  if (type === 'reaction' || type === 'story_reaction') {
    return (
      <span className={`${base} bg-discord-dark`} style={{ fontSize: 10 }}
        dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(reaction || '😮') }} />
    );
  }
  return <span className={`${base} bg-discord-brand`}><FiBell size={8} className="text-white" /></span>;
}

function PostThumb({ post }) {
  if (!post) return null;
  const thumb = post.media?.[0];
  if (!thumb) return null;
  const src = API.getMediaUrl(thumb.url);
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-discord-hover ml-2">
      {thumb.type === 'video'
        ? <video src={src} className="w-full h-full object-cover" muted />
        : <img src={src} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

function groupByDay(notifications) {
  const groups = [];
  const map = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  notifications.forEach(n => {
    const d = new Date(n.createdAt);
    if (isToday(d)) map['Today'].push(n);
    else if (isYesterday(d)) map['Yesterday'].push(n);
    else if (isThisWeek(d)) map['This week'].push(n);
    else map['Earlier'].push(n);
  });
  for (const [label, items] of Object.entries(map)) {
    if (items.length) groups.push({ label, items });
  }
  return groups;
}

function collapseGroup(items) {
  const postMap = new Map();
  const result = [];
  items.forEach(n => {
    const key = n.postId?._id || n.postId;
    const collapsible = ['like', 'reaction', 'bookmark'].includes(n.type);
    if (collapsible && key) {
      const groupKey = `${key}-${n.type}`;
      if (postMap.has(groupKey)) {
        postMap.get(groupKey).push(n);
      } else {
        const arr = [n];
        postMap.set(groupKey, arr);
        result.push({ collapsed: arr, key: groupKey });
      }
    } else {
      result.push({ collapsed: [n], key: n._id });
    }
  });
  return result;
}

export default function Notifications({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(async (pg = 1, reset = false, silent = false) => {
    if (!silent) { if (pg === 1) setLoading(true); else setLoadingMore(true); }
    try {
      API.clearCache('/api/notifications');
      const data = await API.getNotifications(pg, 20);
      const list = Array.isArray(data) ? data : data.notifications || [];
      setNotifications(prev => reset ? list : [...prev, ...list]);
      setHasMore(data.pagination?.hasMore || data.hasMore || list.length === 20);
    } catch { }
    finally { if (!silent) { setLoading(false); setLoadingMore(false); } }
  }, []);

  useEffect(() => {
    fetchNotifications(1, true);
    API.markAllNotificationsRead().catch(() => {});
    window.dispatchEvent(new Event('resetNotifications'));

    const poll = setInterval(() => fetchNotifications(1, true, true), 8000);

    const onFocus = () => fetchNotifications(1, true);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleNotifClick = async (notif) => {
    try { await API.markNotificationRead(notif._id); } catch { }
    setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
    const postId = notif.postId?._id || notif.postId;
    const actor = notif.actorId;
    if (postId && notif.type !== 'follow') navigate(`/post/${postId}`);
    else if (actor?.username) navigate(`/profile/${actor.username}`);
  };

  const groups = groupByDay(notifications);
  const totalUnread = notifications.filter(n => !n.isRead).length;

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-discord-text">Notifications</h1>
          {totalUnread > 0 && (
            <button
              className="flex items-center gap-1.5 text-discord-brand text-sm font-medium hover:underline"
              onClick={() => {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                API.markAllNotificationsRead().catch(() => {});
              }}
            >
              <FiCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-discord-hover flex items-center justify-center mb-4">
              <FiBell size={28} className="text-discord-muted" />
            </div>
            <p className="text-discord-text font-bold text-lg">All caught up!</p>
            <p className="text-discord-muted text-sm mt-1">When people interact with your posts, you'll see it here.</p>
          </div>
        ) : (
          <div className="pb-24">
            {groups.map(({ label, items }) => {
              const collapsed = collapseGroup(items);
              return (
                <div key={label}>
                  <div className="px-4 py-2 sticky top-[57px] z-10">
                    <span className="text-discord-muted text-xs font-bold uppercase tracking-wider">{label}</span>
                  </div>
                  {collapsed.map(({ collapsed: group, key }) => {
                    const n = group[0];
                    const actor = n.actorId;
                    const extras = group.length - 1;
                    const isRead = group.every(g => g.isRead);
                    const postId = n.postId?._id || n.postId;

                    let message = n.message || '';
                    if (extras > 0) {
                      const actorName = actor?.name || actor?.username || 'Someone';
                      message = `${actorName} and ${extras} other${extras > 1 ? 's' : ''} ${n.type === 'like' ? 'liked' : n.type === 'bookmark' ? 'bookmarked' : 'reacted to'} your post`;
                    }

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all active:scale-[0.99] ${isRead ? 'hover:bg-discord-hover/60' : 'bg-discord-brand/5 hover:bg-discord-brand/10 border-l-2 border-discord-brand'}`}
                        onClick={() => handleNotifClick(n)}
                      >
                        {/* Avatar + type icon */}
                        <div className="relative flex-shrink-0">
                          {extras > 0 ? (
                            <div className="flex -space-x-2">
                              {group.slice(0, 3).map((g, i) => (
                                <div key={i} className="w-9 h-9 rounded-full border-2 border-discord-bg overflow-hidden flex-shrink-0">
                                  <Avatar user={g.actorId} size={36} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Avatar user={actor} size={44} />
                          )}
                          <TypeIcon type={n.type} reaction={n.type === 'reaction' || n.type === 'story_reaction' ? n.message?.match(/reacted with (.+)/)?.[1] : null} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          {extras > 0 ? (
                            <p className="text-discord-text text-sm leading-snug"
                              dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(message) }} />
                          ) : (
                            <p className="text-discord-text text-sm leading-snug">
                              <span className="font-semibold"
                                dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(actor?.name || actor?.username || 'Someone') }} />
                              {' '}
                              <span dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(message.replace(/^[^\s]+\s/, '')) }} />
                            </p>
                          )}
                          {n.postId?.caption && !n.postId?.media?.length && (
                            <p className="text-discord-muted text-xs mt-0.5 truncate">{n.postId.caption}</p>
                          )}
                          <p className="text-discord-muted text-[11px] mt-0.5">
                            {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ''}
                          </p>
                        </div>

                        {/* Post thumbnail */}
                        <PostThumb post={n.postId} />

                        {/* Unread dot */}
                        {!isRead && <div className="w-2 h-2 bg-discord-brand rounded-full flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  className="text-discord-brand text-sm font-medium hover:underline"
                  disabled={loadingMore}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchNotifications(next);
                  }}
                >
                  {loadingMore ? (
                    <div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                  ) : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
