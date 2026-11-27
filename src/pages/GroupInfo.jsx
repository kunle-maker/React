import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiUsers, FiLink, FiLogOut, FiTrash2, FiEdit2,
  FiCamera, FiX, FiCheck, FiShare2, FiLock, FiGlobe, FiShield,
  FiUserMinus, FiCopy, FiMessageSquare, FiHash
} from 'react-icons/fi';
import { HiUsers } from 'react-icons/hi';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import { showToast } from '../utils/toast';
import ImageCropModal from '../components/ImageCropModal';
import { useTheme } from '../contexts/ThemeContext';

export default function GroupInfo({ currentUser, unreadCounts }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', privacy: 'private' });
  const [editLoading, setEditLoading] = useState(false);
  const [picPreview, setPicPreview] = useState(null);
  const [picFile, setPicFile] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const picRef = useRef();

  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;
  const memberCount = group?.members?.length || 0;

  useEffect(() => { fetchGroup(); }, [groupId]);
  useEffect(() => {
    if (group) {
      setMembersLoading(true);
      API.getGroupMembers(groupId)
        .then(data => setMembers(Array.isArray(data) ? data : data?.members || []))
        .catch(() => {})
        .finally(() => setMembersLoading(false));
    }
  }, [group?._id]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const data = await API.getGroup(groupId);
      const g = data.group || data;
      setGroup(g);
      setEditForm({ name: g.name || '', description: g.description || '', privacy: g.privacy || 'private' });
    } catch { navigate('/groups'); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', editForm.name);
      fd.append('description', editForm.description);
      fd.append('privacy', editForm.privacy);
      if (picFile) fd.append('profilePicture', picFile);
      await API.updateGroup(groupId, fd);
      await fetchGroup();
      setEditing(false);
      setPicPreview(null);
      setPicFile(null);
      showToast('Group updated!', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to update', { type: 'error' }); }
    finally { setEditLoading(false); }
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) setCropSrc(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleCropDone = (croppedFile, croppedUrl) => {
    setPicFile(croppedFile);
    setPicPreview(croppedUrl);
    setCropSrc(null);
  };

  const getInviteLink = () => {
    if (!group?.inviteCode) return '';
    return `${window.location.origin}/#/join/${group.inviteCode}`;
  };

  const copyInvite = async () => {
    try {
      let code = group?.inviteCode;
      if (!code) {
        const data = await API.generateInviteCode(groupId);
        code = data.inviteCode || data.code || data;
        setGroup(prev => ({ ...prev, inviteCode: code }));
      }
      const link = `${window.location.origin}/#/join/${code}`;
      navigator.clipboard?.writeText(link);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch { showToast('Failed to copy invite', { type: 'error' }); }
  };

  const shareInvite = async () => {
    const link = getInviteLink();
    if (navigator.share && link) {
      try { await navigator.share({ title: `Join ${group.name} on VesselX`, url: link }); return; } catch {}
    }
    copyInvite();
  };

  const handleKick = async (memberId, name) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await API.removeGroupMember(groupId, memberId);
      setMembers(prev => prev.filter(m => (m._id || m.userId?._id) !== memberId));
      showToast(`${name} removed`, { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try { await API.leaveGroup(groupId); navigate('/groups'); }
    catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this group? This cannot be undone.')) return;
    try { await API.deleteGroup(groupId); navigate('/groups'); }
    catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
  };

  const cardBg    = isLight ? 'bg-white border border-[#efefef]'      : 'bg-discord-sidebar border border-white/5';
  const rowBorder = isLight ? 'border-[#f0f0f0]'                      : 'border-white/5';

  if (loading) return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <>
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="max-w-2xl mx-auto pb-24 md:pb-6 bg-discord-bg min-h-full">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-discord-sidebar border-b border-discord-hover px-4 py-3 flex items-center gap-3">
            <button className="p-1.5 rounded-full text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors" onClick={() => navigate(`/groups/${groupId}`)}>
              <FiArrowLeft size={20} />
            </button>
            <h1 className="flex-1 font-bold text-discord-text">
              {editing ? 'Edit Group' : (isAdmin ? 'Group Settings' : 'Group Info')}
            </h1>
            {isAdmin && !editing && (
              <button className="flex items-center gap-1.5 text-sm font-semibold text-discord-brand bg-discord-brand/10 border border-discord-brand/20 px-3 py-1.5 rounded-full hover:bg-discord-brand/20 transition-all" onClick={() => setEditing(true)}>
                <FiEdit2 size={13} /> Edit
              </button>
            )}
            {editing && (
              <button className="p-1.5 rounded-full text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors" onClick={() => { setEditing(false); setPicPreview(null); setPicFile(null); }}>
                <FiX size={18} />
              </button>
            )}
          </div>

          {editing ? (
            /* ── Edit form ── */
            <form onSubmit={handleSave} className="p-4 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center pt-2">
                <div className="relative cursor-pointer group" onClick={() => picRef.current?.click()}>
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl" style={{ borderRadius: 20 }}>
                    {picPreview ? (
                      <img src={picPreview} alt="" className="w-full h-full object-cover" />
                    ) : group?.profilePicture ? (
                      <img src={API.getAvatarUrl(group.profilePicture, 192)} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5865f2,#8b5cf6)' }}>
                        <HiUsers size={32} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiCamera size={22} className="text-white" />
                  </div>
                </div>
                <input ref={picRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
                <p className="text-discord-muted text-xs mt-2">Tap to change photo</p>
              </div>

              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase tracking-wider mb-1.5">Group Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="discord-input w-full" required maxLength={80} />
              </div>
              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="discord-input w-full resize-none" rows={3} maxLength={300} placeholder="What's this group about?" />
              </div>
              <div>
                <label className="block text-discord-muted text-xs font-bold uppercase tracking-wider mb-2">Privacy</label>
                <div className="flex gap-2">
                  {[{ id: 'private', icon: FiLock, label: 'Private' }, { id: 'public', icon: FiGlobe, label: 'Public' }].map(p => (
                    <button key={p.id} type="button" onClick={() => setEditForm(f => ({ ...f, privacy: p.id }))}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border transition-all ${editForm.privacy === p.id ? 'border-discord-brand bg-discord-brand/10 text-discord-brand' : 'border-discord-hover text-discord-muted'}`}>
                      <p.icon size={14} /><span className="text-sm font-semibold">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-discord-muted border border-discord-hover hover:bg-discord-hover transition-colors" onClick={() => { setEditing(false); setPicPreview(null); setPicFile(null); }}>Cancel</button>
                <button type="submit" disabled={editLoading || !editForm.name.trim()} className="discord-btn flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 p-4">

              {/* Hero card */}
              <div className={`rounded-2xl overflow-hidden ${cardBg}`}>
                {/* Cover gradient */}
                <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #5865f2 0%, #8b5cf6 50%, #10b981 100%)' }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)' }} />
                </div>
                {/* Avatar + info */}
                <div className="px-5 pb-5">
                  <div className="flex items-end justify-between -mt-10 mb-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 shadow-xl" style={{ borderColor: isLight ? '#ffffff' : '#111318', borderRadius: 18 }}>
                      {group?.profilePicture ? (
                        <img src={API.getAvatarUrl(group.profilePicture, 160)} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5865f2, #8b5cf6)' }}>
                          {group?.isChannel ? <FiHash size={28} className="text-white" /> : <HiUsers size={28} className="text-white" />}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/groups/${groupId}`)}
                      className="discord-btn flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl"
                    >
                      <FiMessageSquare size={14} /> Open Chat
                    </button>
                  </div>
                  <h2 className="font-black text-discord-text text-xl leading-tight">{group?.name}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-discord-muted text-sm flex items-center gap-1">
                      <FiUsers size={12} /> {memberCount} {group?.isChannel ? 'subscribers' : 'members'}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${group?.privacy === 'private' ? 'bg-discord-hover text-discord-muted' : 'bg-green-500/15 text-green-500'}`}>
                      {group?.privacy === 'private' ? <><FiLock size={10} /> Private</> : <><FiGlobe size={10} /> Public</>}
                    </span>
                    {group?.isChannel && (
                      <span className="text-xs font-bold text-discord-brand bg-discord-brand/10 px-2 py-0.5 rounded-full border border-discord-brand/20">📢 Channel</span>
                    )}
                  </div>
                  {group?.description && (
                    <p className="text-discord-muted text-sm mt-3 leading-relaxed">{group.description}</p>
                  )}
                </div>
              </div>

              {/* Invite card */}
              <div className={`rounded-2xl ${cardBg}`}>
                <div className={`px-4 py-3 border-b ${rowBorder}`}>
                  <p className="text-discord-muted text-xs font-bold uppercase tracking-wider">Invite</p>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-discord-text text-sm font-semibold">Invite Link</p>
                    <p className="text-discord-muted text-xs truncate mt-0.5">
                      {group?.inviteCode ? `.../#/join/${group.inviteCode}` : 'Generate a link to invite people'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={copyInvite}
                      className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full transition-all ${showCopied ? 'bg-green-500/15 text-green-500' : 'bg-discord-brand/10 text-discord-brand hover:bg-discord-brand/20'}`}
                    >
                      {showCopied ? <><FiCheck size={12} /> Copied!</> : <><FiCopy size={12} /> Copy</>}
                    </button>
                    <button onClick={shareInvite} className="p-2 text-discord-muted hover:text-discord-brand rounded-full hover:bg-discord-hover transition-colors">
                      <FiShare2 size={16} />
                    </button>
                  </div>
                </div>
                {group?.createdAt && (
                  <div className={`px-4 py-3 flex items-center justify-between border-t ${rowBorder}`}>
                    <span className="text-discord-muted text-sm">Created</span>
                    <span className="text-discord-text text-sm font-medium">{format(new Date(group.createdAt), 'MMMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Members preview card */}
              <div className={`rounded-2xl ${cardBg}`}>
                <div className={`px-4 py-3 flex items-center justify-between border-b ${rowBorder}`}>
                  <p className="text-discord-muted text-xs font-bold uppercase tracking-wider">Members · {memberCount}</p>
                  <button onClick={() => navigate(`/groups/${groupId}/members`)} className="text-discord-brand text-xs font-semibold hover:underline">See all</button>
                </div>
                {membersLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-discord-muted text-sm text-center py-6">No members found</p>
                ) : members.slice(0, 5).map((m, i) => {
                  const user = m.user || m;
                  const memberId = m._id || user._id;
                  const uname = user.username || m.username;
                  const name = user.name || m.name || uname;
                  const adminId = group?.admin?._id || group?.admin;
                  const isMemberAdmin = memberId === adminId || user._id === adminId;
                  const isMe = memberId === myId || user._id === myId;
                  return (
                    <div key={memberId || i} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(members.length, 5) - 1 ? `border-b ${rowBorder}` : ''} hover:bg-discord-hover/30 transition-colors`}>
                      <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${uname}`)}>
                        <Avatar user={user} size={40} />
                        {isMemberAdmin && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-discord-brand rounded-full flex items-center justify-center">
                            <FiShield size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${uname}`)}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-discord-text text-sm truncate">{name}</span>
                          {isMemberAdmin && <span className="text-[9px] font-black text-discord-brand bg-discord-brand/10 px-1.5 py-0.5 rounded-full border border-discord-brand/20 flex-shrink-0">ADMIN</span>}
                          {isMe && <span className="text-[9px] font-bold text-discord-muted bg-discord-hover px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>}
                        </div>
                        <p className="text-discord-muted text-xs">@{uname}</p>
                      </div>
                      {isAdmin && !isMe && !isMemberAdmin && (
                        <button onClick={() => handleKick(memberId || user._id, name)} className="p-1.5 rounded-lg text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-all flex-shrink-0" title="Remove">
                          <FiUserMinus size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {members.length > 5 && (
                  <button onClick={() => navigate(`/groups/${groupId}/members`)} className={`w-full py-3 text-sm text-discord-brand font-semibold border-t ${rowBorder} hover:bg-discord-hover/30 transition-colors`}>
                    View all {memberCount} members →
                  </button>
                )}
              </div>

              {/* Danger zone */}
              <div className={`rounded-2xl ${cardBg}`}>
                {!isAdmin ? (
                  <button onClick={handleLeave} className="flex items-center gap-3 w-full px-4 py-4 text-discord-red hover:bg-discord-red/10 rounded-2xl transition-colors font-semibold text-sm">
                    <FiLogOut size={16} /> Leave Group
                  </button>
                ) : (
                  <>
                    <div className={`px-4 py-3 border-b ${rowBorder}`}>
                      <p className="text-discord-red text-xs font-bold uppercase tracking-wider">Danger Zone</p>
                    </div>
                    <p className="text-discord-muted text-xs px-4 py-3">Transfer admin to another member before leaving, or delete the group permanently.</p>
                    <button onClick={handleDelete} className={`flex items-center gap-3 w-full px-4 py-3.5 text-discord-red hover:bg-discord-red/10 rounded-b-2xl transition-colors font-semibold text-sm border-t ${rowBorder}`}>
                      <FiTrash2 size={16} /> Delete Group Permanently
                    </button>
                  </>
                )}
              </div>

            </div>
          )}
        </div>
      </Layout>

      {cropSrc && (
        <ImageCropModal src={cropSrc} circular aspectRatio={1} onCrop={handleCropDone} onCancel={() => setCropSrc(null)} />
      )}
    </>
  );
}
