import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiPlus, FiSearch, FiLink, FiLock, FiGlobe } from 'react-icons/fi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';

export default function Groups({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [createForm, setCreateForm] = useState({ name: '', description: '', privacy: 'private' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await API.getGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
    finally { setLoading(false); }
  };

  const searchGroups = async (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await API.searchGroups(q);
      setSearchResults(Array.isArray(res) ? res : []);
    } catch { setSearchResults([]); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('name', createForm.name);
      fd.append('description', createForm.description);
      fd.append('privacy', createForm.privacy);
      const data = await API.createGroup(fd);
      const group = data.group || data;
      setGroups(prev => [group, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', privacy: 'private' });
      navigate(`/groups/${group._id}`);
    } catch (err) { alert(err.message || 'Failed to create group'); }
    finally { setCreating(false); }
  };

  const handleJoinByCode = async () => {
    const code = prompt('Enter invite code:');
    if (!code) return;
    try {
      const data = await API.joinGroup(code.trim());
      const group = data.group || data;
      fetchGroups();
      navigate(`/groups/${group._id}`);
    } catch (err) { alert(err.message || 'Invalid invite code'); }
  };

  const displayGroups = searchQ ? searchResults : groups;

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-discord-text">Groups</h1>
            <div className="flex gap-2">
              <button className="discord-btn-ghost flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-discord-hover" onClick={handleJoinByCode}>
                <FiLink size={14} /> Join
              </button>
              <button className="discord-btn flex items-center gap-1 text-sm px-3 py-1.5 rounded-md" onClick={() => setShowCreate(true)}>
                <FiPlus size={14} /> New
              </button>
            </div>
          </div>
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
            <input
              type="text"
              value={searchQ}
              onChange={e => searchGroups(e.target.value)}
              placeholder="Search groups..."
              className="discord-input pl-9 py-2 text-sm w-full rounded-full"
            />
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-discord-sidebar rounded-lg p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-discord-text mb-4">Create a Group</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Group Name</label>
                  <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="discord-input w-full" required autoFocus />
                </div>
                <div>
                  <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Description (optional)</label>
                  <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className="discord-input w-full resize-none" rows={2} />
                </div>
                <div>
                  <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Privacy</label>
                  <div className="flex gap-3">
                    {['private', 'public'].map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors ${createForm.privacy === p ? 'border-discord-brand bg-discord-brand/10 text-discord-brand' : 'border-discord-hover text-discord-muted hover:border-discord-muted'}`}
                        onClick={() => setCreateForm({ ...createForm, privacy: p })}
                      >
                        {p === 'private' ? <FiLock size={14} /> : <FiGlobe size={14} />}
                        <span className="capitalize text-sm font-medium">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" className="discord-btn-ghost flex-1 py-2 rounded-md border border-discord-hover" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" disabled={creating} className="discord-btn flex-1 py-2 rounded-md disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayGroups.length === 0 ? (
          <div className="text-center py-16 text-discord-muted">
            <FiUsers size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-discord-text font-semibold">No groups yet</p>
            <p className="text-sm mt-1">Create or join a group to get started</p>
          </div>
        ) : (
          <div>
            {displayGroups.map(g => (
              <div
                key={g._id}
                className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover cursor-pointer hover:bg-discord-hover transition-colors"
                onClick={() => navigate(`/groups/${g._id}`)}
              >
                <div className="relative flex-shrink-0">
                  {g.profilePicture ? (
                    <img src={API.getAvatarUrl(g.profilePicture, 80)} alt={g.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-discord-brand flex items-center justify-center">
                      <FiUsers size={20} className="text-white" />
                    </div>
                  )}
                  {g.privacy === 'private' ? (
                    <FiLock size={10} className="absolute -bottom-0.5 -right-0.5 text-discord-muted bg-discord-sidebar p-0.5 rounded-full" />
                  ) : (
                    <FiGlobe size={10} className="absolute -bottom-0.5 -right-0.5 text-discord-green bg-discord-sidebar p-0.5 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-discord-text truncate">{g.name}</span>
                    {g.isChannel && (
                      <span className="text-[10px] font-bold text-discord-brand bg-discord-brand/15 px-1.5 py-0.5 rounded-full border border-discord-brand/30 flex-shrink-0">📢 Channel</span>
                    )}
                    {g.unreadCount > 0 && <span className="badge">{g.unreadCount}</span>}
                  </div>
                  <p className="text-discord-muted text-xs truncate">{g.description || `${g.members?.length || 0} members`}</p>
                </div>
                <span className="text-discord-muted text-xs flex-shrink-0">{g.members?.length || 0} members</span>
              </div>
            ))}
          </div>
        )}
        <div className="h-20 md:h-4" />
      </div>
    </Layout>
  );
}
