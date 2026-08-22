import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiHash, FiTrendingUp, FiMusic, FiUserPlus } from 'react-icons/fi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { VerifiedBadge, SupaBadge } from '../components/UserBadge';
import API from '../utils/api';

const TABS = ['all', 'users', 'posts', 'hashtags', 'sounds'];

function TabBar({ activeTab, setActiveTab, hasQuery }) {
  const tabs = hasQuery ? TABS : ['trending', 'suggestions'];
  return (
    <div className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-discord-hover mt-2">
      {tabs.map(t => (
        <button
          key={t}
          className={`flex-shrink-0 px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${activeTab === t ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`}
          onClick={() => setActiveTab(t)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function Search({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTag = searchParams.get('tag') ? `#${searchParams.get('tag')}` : '';
  const [query, setQuery] = useState(initialTag);
  const [tab, setTab] = useState(initialTag ? 'posts' : 'trending');
  const [results, setResults] = useState({ users: [], posts: [], hashtags: [], sounds: [] });
  const [trending, setTrending] = useState({ hashtags: [], posts: [], sounds: [] });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.getTrending().then(d => setTrending(d || {})).catch(() => {});
    API.getUserSuggestions(8).then(d => setSuggestions(d?.suggestions || [])).catch(() => {});
    if (initialTag) handleSearch(initialTag);
  }, []);

  const handleSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults({ users: [], posts: [], hashtags: [], sounds: [] }); return; }
    setLoading(true);
    try {
      if (q.startsWith('#')) {
        const tag = q.slice(1);
        const [hashRes] = await Promise.all([
          API.getHashtagPosts(tag, 1, 30).catch(() => ({ posts: [] }))
        ]);
        setResults(prev => ({ ...prev, posts: hashRes.posts || [], hashtags: [] }));
        setTab('posts');
      } else {
        const data = await API.unifiedSearch(q, null, 20);
        setResults({
          users: data?.users || [],
          posts: data?.posts || [],
          hashtags: data?.hashtags || [],
          sounds: data?.sounds || []
        });
        if (!['all', 'users', 'posts', 'hashtags', 'sounds'].includes(tab)) setTab('all');
      }
    } catch {
      try {
        const userRes = await API.searchUsers(q);
        setResults(prev => ({ ...prev, users: Array.isArray(userRes) ? userRes : userRes?.users || [] }));
        setTab('users');
      } catch {}
    }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => handleSearch(val), 400);
  };

  const hasQuery = query.trim().length > 0;
  const allUsers = results.users;
  const allPosts = results.posts;

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
              placeholder="Search people, posts, #hashtags..."
              className="discord-input pl-9 w-full rounded-full"
              autoFocus
            />
          </div>
          <TabBar activeTab={tab} setActiveTab={setTab} hasQuery={hasQuery} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasQuery ? (
          <>
            {tab === 'trending' && (
              <div className="p-4 space-y-6">
                {trending.hashtags?.length > 0 && (
                  <div>
                    <h3 className="text-discord-text font-bold text-sm flex items-center gap-2 mb-3">
                      <FiTrendingUp size={15} className="text-discord-brand" /> Trending Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {trending.hashtags.map((h, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-1.5 bg-discord-brand/10 border border-discord-brand/20 text-discord-brand text-sm font-bold px-3 py-1.5 rounded-full hover:bg-discord-brand/20 transition-colors"
                          onClick={() => { setQuery(`#${h.tag || h}`); handleSearch(`#${h.tag || h}`); }}
                        >
                          <FiHash size={12} /> {h.tag || h}
                          {h.count && <span className="text-[10px] text-discord-muted ml-1">{h.count.toLocaleString()}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {trending.posts?.length > 0 && (
                  <div>
                    <h3 className="text-discord-text font-bold text-sm flex items-center gap-2 mb-3">
                      <FiTrendingUp size={15} className="text-orange-400" /> Trending Posts
                    </h3>
                    {trending.posts.slice(0, 5).map(p => (
                      <PostCard key={p._id} post={p} currentUser={currentUser} />
                    ))}
                  </div>
                )}
                {trending.sounds?.length > 0 && (
                  <div>
                    <h3 className="text-discord-text font-bold text-sm flex items-center gap-2 mb-3">
                      <FiMusic size={15} className="text-purple-400" /> Trending Sounds
                    </h3>
                    <div className="space-y-2">
                      {trending.sounds.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-discord-hover/30 border border-discord-hover rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <FiMusic size={18} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-discord-text text-sm font-semibold truncate">{s.name || s.title || 'Sound'}</p>
                            {s.artist && <p className="text-discord-muted text-xs truncate">{s.artist}</p>}
                          </div>
                          {s.usageCount && <span className="text-discord-muted text-xs">{s.usageCount.toLocaleString()} uses</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!trending.hashtags?.length && !trending.posts?.length && (
                  <div className="text-center py-16 text-discord-muted">
                    <FiTrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-discord-text font-semibold">No trending data yet</p>
                  </div>
                )}
              </div>
            )}
            {tab === 'suggestions' && (
              <div className="py-2">
                <div className="px-4 py-2">
                  <h3 className="text-discord-text font-bold text-sm flex items-center gap-2">
                    <FiUserPlus size={15} className="text-discord-brand" /> Suggested for You
                  </h3>
                </div>
                {suggestions.length === 0 ? (
                  <div className="text-center py-12 text-discord-muted text-sm">No suggestions available</div>
                ) : suggestions.map(u => (
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
                    <div className="text-discord-muted text-xs flex-shrink-0 text-right">
                      <span>{u.followers?.length || u.followerCount || 0} followers</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {(tab === 'all' || tab === 'users') && allUsers.length > 0 && (
              <div>
                {tab === 'all' && <div className="px-4 py-2 border-b border-discord-hover"><h3 className="text-discord-text font-bold text-xs uppercase tracking-wider text-discord-muted">People</h3></div>}
                {allUsers.slice(0, tab === 'all' ? 3 : 50).map(u => (
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
                      {(u.followers?.length || u.followerCount || 0).toLocaleString()} followers
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(tab === 'all' || tab === 'hashtags') && results.hashtags?.length > 0 && (
              <div>
                {tab === 'all' && <div className="px-4 py-2 border-b border-discord-hover"><h3 className="text-discord-text font-bold text-xs uppercase tracking-wider text-discord-muted">Hashtags</h3></div>}
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  {results.hashtags.slice(0, tab === 'all' ? 8 : 30).map((h, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-1.5 bg-discord-brand/10 border border-discord-brand/20 text-discord-brand text-sm font-bold px-3 py-1.5 rounded-full hover:bg-discord-brand/20 transition-colors"
                      onClick={() => { const tag = h.tag || h; setQuery(`#${tag}`); handleSearch(`#${tag}`); }}
                    >
                      <FiHash size={12} /> {h.tag || h}
                      {h.count && <span className="text-[10px] text-discord-muted ml-1">{h.count.toLocaleString()}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(tab === 'all' || tab === 'sounds') && results.sounds?.length > 0 && (
              <div>
                {tab === 'all' && <div className="px-4 py-2 border-b border-discord-hover"><h3 className="text-discord-text font-bold text-xs uppercase tracking-wider text-discord-muted">Sounds</h3></div>}
                <div className="space-y-2 px-4 py-3">
                  {results.sounds.slice(0, tab === 'all' ? 3 : 20).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-discord-hover/30 border border-discord-hover rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <FiMusic size={18} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-discord-text text-sm font-semibold truncate">{s.name || s.title || 'Sound'}</p>
                        {s.artist && <p className="text-discord-muted text-xs truncate">{s.artist}</p>}
                      </div>
                      {s.usageCount && <span className="text-discord-muted text-xs">{s.usageCount.toLocaleString()} uses</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(tab === 'all' || tab === 'posts') && allPosts.length > 0 && (
              <div>
                {tab === 'all' && <div className="px-4 py-2 border-b border-discord-hover"><h3 className="text-discord-text font-bold text-xs uppercase tracking-wider text-discord-muted">Posts</h3></div>}
                {allPosts.slice(0, tab === 'all' ? 5 : 50).map(post => (
                  <PostCard key={post._id} post={post} currentUser={currentUser} />
                ))}
              </div>
            )}

            {tab !== 'all' && (
              (tab === 'users' && allUsers.length === 0) ||
              (tab === 'posts' && allPosts.length === 0) ||
              (tab === 'hashtags' && !results.hashtags?.length) ||
              (tab === 'sounds' && !results.sounds?.length)
            ) && (
              <div className="text-center py-12 text-discord-muted text-sm">No {tab} found for "{query}"</div>
            )}

            {tab === 'all' && !allUsers.length && !allPosts.length && !results.hashtags?.length && !results.sounds?.length && (
              <div className="text-center py-16 text-discord-muted">
                <FiSearch size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-discord-text font-semibold">No results found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
