import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiPlus, FiSearch, FiLink, FiLock, FiGlobe, FiX, FiHash, FiMic } from 'react-icons/fi';
import { HiUsers } from 'react-icons/hi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import { showToast } from '../utils/toast';
import { useTheme } from '../contexts/ThemeContext';

function GroupCard({ g, onClick }) {
  const memberCount = g.members?.length || g.memberCount || 0;
  return (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5 cursor-pointer hover:bg-discord-hover/40 transition-colors active:scale-[0.98] border-b border-discord-hover/40"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {g.profilePicture ? (
          <img src={API.getAvatarUrl(g.profilePicture, 80)} alt={g.name} className="w-13 h-13 rounded-2xl object-cover" style={{ width: 52, height: 52, borderRadius: 14 }} />
        ) : (
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #5865f2, #8b5cf6)' }}>
            {g.isChannel ? <FiHash size={22} className="text-white" /> : <HiUsers size={22} className="text-white" />}
          </div>
        )}
        {/* Privacy badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-discord-sidebar flex items-center justify-center border border-discord-hover">
          {g.privacy === 'private'
            ? <FiLock size={9} className="text-discord-muted" />
            : <FiGlobe size={9} className="text-green-500" />
          }
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-discord-text text-[15px] truncate">{g.name}</span>
          {g.isChannel && (
            <span className="text-[9px] font-black text-discord-brand bg-discord-brand/10 px-1.5 py-0.5 rounded-full border border-discord-brand/20 flex-shrink-0 uppercase tracking-wide">Channel</span>
          )}
        </div>
        <p className="text-discord-muted text-xs truncate leading-snug">
          {g.description || `${memberCount} ${g.isChannel ? 'subscribers' : 'members'}`}
        </p>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {g.unreadCount > 0 && (
          <span className="badge text-[10px] min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {g.unreadCount > 99 ? '99+' : g.unreadCount}
          </span>
        )}
        <span className="text-discord-muted text-[11px] font-semibold">{memberCount} {g.isChannel ? 'subs' : 'members'}</span>
      </div>
    </div>
  );
}

export default function Groups({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine'); // 'mine' | 'discover'
  const [showCreate, setShowCreate] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', privacy: 'private', type: 'group' });
  const [creating, setCreating] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const data = await API.getGroups();
      setMyGroups(Array.isArray(data) ? data : []);
    } catch { setMyGroups([]); }
    finally { setLoading(false); }
  };

  const handleSearch = (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await API.searchGroups(q);
        setSearchResults(Array.isArray(res) ? res : []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
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
      if (createForm.type === 'channel') fd.append('isChannel', 'true');
      const data = await API.createGroup(fd);
      const group = data.group || data;
      setMyGroups(prev => [group, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '', privacy: 'private', type: 'group' });
      navigate(`/groups/${group._id}`);
    } catch (err) { showToast(err.message || 'Failed to create', { type: 'error' }); }
    finally { setCreating(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const data = await API.joinGroup(joinCode.trim());
      const group = data.group || data;
      fetchGroups();
      setShowJoinSheet(false);
      setJoinCode('');
      navigate(`/groups/${group._id}`);
    } catch (err) { showToast(err.message || 'Invalid invite code', { type: 'error' }); }
    finally { setJoining(false); }
  };

  const displayGroups = searchQ ? searchResults : (tab === 'mine' ? myGroups : []);

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto bg-discord-bg min-h-full">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-discord-sidebar backdrop-blur border-b border-discord-hover">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h1 className="text-xl font-bold text-discord-text">Groups</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJoinSheet(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-discord-text bg-discord-hover px-3 py-1.5 rounded-xl border border-discord-hover hover:bg-discord-darker transition-colors"
              >
                <FiLink size={13} /> Join
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="discord-btn flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl"
              >
                <FiPlus size={14} /> New
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search groups..."
                className="discord-input pl-9 py-2 text-sm w-full rounded-xl"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text">
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs — only show when not searching */}
          {!searchQ && (
            <div className="flex px-4 pb-0 gap-1">
              {[{ id: 'mine', label: 'My Groups' }, { id: 'discover', label: 'Discover' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${tab === t.id ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`}
                >
                  {t.label}
                  {t.id === 'mine' && myGroups.length > 0 && (
                    <span className="ml-1.5 text-[10px] font-black bg-discord-hover text-discord-muted px-1.5 py-0.5 rounded-full">{myGroups.length}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : searchQ ? (
          searching ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 text-discord-muted">
              <FiSearch size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-discord-text">No results for "{searchQ}"</p>
            </div>
          ) : searchResults.map(g => (
            <GroupCard key={g._id} g={g} onClick={() => navigate(`/groups/${g._id}`)} />
          ))
        ) : tab === 'mine' ? (
          myGroups.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-discord-brand/10 border border-discord-brand/20 flex items-center justify-center mx-auto mb-4">
                <HiUsers size={28} className="text-discord-brand" />
              </div>
              <p className="font-bold text-discord-text text-lg">No groups yet</p>
              <p className="text-discord-muted text-sm mt-1 mb-5">Create a group to chat with multiple people</p>
              <button className="discord-btn px-6 py-2.5 rounded-xl" onClick={() => setShowCreate(true)}>
                <FiPlus size={16} className="inline mr-1.5" /> Create Group
              </button>
            </div>
          ) : myGroups.map(g => (
            <GroupCard key={g._id} g={g} onClick={() => navigate(`/groups/${g._id}`)} />
          ))
        ) : (
          /* Discover tab */
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-discord-hover flex items-center justify-center mx-auto mb-4">
              <FiSearch size={28} className="text-discord-muted" />
            </div>
            <p className="font-bold text-discord-text">Discover Groups</p>
            <p className="text-discord-muted text-sm mt-1">Search above to find public groups to join</p>
          </div>
        )}

        <div className="h-24 md:h-4" />
      </div>

      {/* Create Group Sheet */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden sheet-slide-up"
            style={{ background: isLight ? '#ffffff' : '#111318' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-discord-text">Create Group</h2>
              <button onClick={() => setShowCreate(false)} className="text-discord-muted hover:text-discord-text p-1 rounded-full">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-5 pb-6 space-y-4">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'group', icon: HiUsers, label: 'Group', desc: 'Chat with multiple people' },
                  { id: 'channel', icon: FiHash, label: 'Channel', desc: 'Broadcast to subscribers' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCreateForm(f => ({ ...f, type: t.id }))}
                    className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${createForm.type === t.id ? 'border-discord-brand bg-discord-brand/5' : 'border-discord-hover bg-discord-hover/30'}`}
                  >
                    <t.icon size={18} className={createForm.type === t.id ? 'text-discord-brand' : 'text-discord-muted'} />
                    <span className={`font-bold text-sm mt-1 ${createForm.type === t.id ? 'text-discord-brand' : 'text-discord-text'}`}>{t.label}</span>
                    <span className="text-discord-muted text-[11px]">{t.desc}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Name *</label>
                <input
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="discord-input w-full"
                  placeholder={createForm.type === 'channel' ? 'e.g. Tech News' : 'e.g. Friends Chat'}
                  required autoFocus maxLength={80}
                />
              </div>

              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  className="discord-input w-full resize-none"
                  rows={2}
                  placeholder="What's this group about?"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Privacy</label>
                <div className="flex gap-2">
                  {[
                    { id: 'private', icon: FiLock, label: 'Private', desc: 'Invite only' },
                    { id: 'public', icon: FiGlobe, label: 'Public', desc: 'Anyone can join' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCreateForm(f => ({ ...f, privacy: p.id }))}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all ${createForm.privacy === p.id ? 'border-discord-brand bg-discord-brand/10 text-discord-brand' : 'border-discord-hover text-discord-muted hover:border-discord-muted'}`}
                    >
                      <p.icon size={15} />
                      <div className="text-left">
                        <span className="text-sm font-bold block">{p.label}</span>
                        <span className="text-[10px] opacity-70">{p.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-discord-muted border border-discord-hover hover:bg-discord-hover transition-colors" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !createForm.name.trim()} className="discord-btn flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {creating ? 'Creating…' : `Create ${createForm.type === 'channel' ? 'Channel' : 'Group'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join by code sheet */}
      {showJoinSheet && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowJoinSheet(false)}>
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl sheet-slide-up"
            style={{ background: isLight ? '#ffffff' : '#111318' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-discord-text">Join a Group</h2>
              <button onClick={() => setShowJoinSheet(false)} className="text-discord-muted hover:text-discord-text p-1 rounded-full"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleJoin} className="px-5 pb-6 space-y-4">
              <p className="text-discord-muted text-sm">Enter an invite code or link to join a private group.</p>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="discord-input w-full"
                placeholder="Paste invite code or link..."
                autoFocus
              />
              <button type="submit" disabled={joining || !joinCode.trim()} className="discord-btn w-full py-2.5 rounded-xl disabled:opacity-50">
                {joining ? 'Joining…' : 'Join Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
