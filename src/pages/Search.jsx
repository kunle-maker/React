import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { VerifiedBadge, SupaBadge } from '../components/UserBadge';
import API from '../utils/api';

export default function Search({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('tag') ? `#${searchParams.get('tag')}` : '');
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setUsers([]); setPosts([]); return; }
    setLoading(true);
    try {
      if (q.startsWith('#')) {
        const tag = q.slice(1);
        const res = await API.searchPostsByHashtag(tag);
        setPosts(Array.isArray(res) ? res : res.posts || []);
        setTab('posts');
      } else {
        const [userRes] = await Promise.all([API.searchUsers(q)]);
        setUsers(Array.isArray(userRes) ? userRes : userRes.users || []);
      }
    } catch { }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => handleSearch(val), 400);
  };

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur px-4 py-3 border-b border-discord-hover">
          <div className="relative">
            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder="Search users or #hashtags..."
              className="discord-input pl-9 w-full rounded-full"
              autoFocus
            />
          </div>
          {query && (
            <div className="flex gap-4 mt-3">
              {['users', 'posts'].map(t => (
                <button
                  key={t}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors capitalize ${tab === t ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !query ? (
          <div className="text-center py-16 text-discord-muted">
            <FiSearch size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-discord-text font-semibold">Find people & posts</p>
            <p className="text-sm mt-1">Search by username or use #hashtag to find posts</p>
          </div>
        ) : tab === 'users' ? (
          <div>
            {users.length === 0 ? (
              <div className="text-center py-12 text-discord-muted">No users found</div>
            ) : users.map(u => (
              <div
                key={u._id || u.username}
                className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover cursor-pointer hover:bg-discord-hover transition-colors"
                onClick={() => navigate(`/profile/${u.username}`)}
              >
                <Avatar user={u} size={44} showStatus />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-discord-text truncate">{u.name}</span>
                    {u.isVerified && <VerifiedBadge size={14} />}
                    {u.isSupa && <SupaBadge size={14} username={u.username} />}
                  </div>
                  <p className="text-discord-muted text-sm truncate">@{u.username}</p>
                  {u.bio && <p className="text-discord-muted text-xs truncate mt-0.5">{u.bio}</p>}
                </div>
                <div className="text-discord-muted text-xs flex-shrink-0">
                  {u.followers?.length || 0} followers
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {posts.length === 0 ? (
              <div className="text-center py-12 text-discord-muted">No posts found</div>
            ) : posts.map(post => (
              <PostCard key={post._id} post={post} currentUser={currentUser} />
            ))}
          </div>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
