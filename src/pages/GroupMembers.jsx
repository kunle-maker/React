import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiLink, FiUserPlus, FiLogOut, FiShield, FiUserMinus, FiSearch, FiX } from 'react-icons/fi';
import { HiShieldCheck } from 'react-icons/hi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import { showToast } from '../utils/toast';

export default function GroupMembers({ currentUser, unreadCounts }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;

  useEffect(() => { fetchGroup(); }, [groupId]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const data = await API.getGroup(groupId);
      setGroup(data);
      setMembers(data.members || []);
    } catch { navigate('/groups'); }
    finally { setLoading(false); }
  };

  const handleAddMember = async () => {
    if (!addUsername.trim()) return;
    setAddLoading(true);
    try {
      await API.addGroupMember(groupId, addUsername.trim());
      await fetchGroup();
      setAddUsername('');
      setShowAddMember(false);
    } catch (err) {
      showToast(err.message || 'Failed to add member', { type: 'error' });
    } finally { setAddLoading(false); }
  };

  const handleKickMember = async (member) => {
    if (!confirm(`Remove ${member.name || member.username} from the group?`)) return;
    try {
      await API.removeGroupMember(groupId, member._id);
      await fetchGroup();
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
  };

  const handleTransferAdmin = async (member) => {
    if (!confirm(`Make ${member.name || member.username} the new admin?`)) return;
    try {
      await API.transferGroupAdmin(groupId, member._id);
      await fetchGroup();
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await API.leaveGroup(groupId);
      navigate('/groups');
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
  };

  const copyInvite = () => {
    if (group?.inviteCode) {
      navigator.clipboard?.writeText(`${window.location.origin}/#/join/${group.inviteCode}`);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const filteredMembers = searchQ
    ? members.filter(m =>
        m.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        m.username?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : members;

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto pb-20 md:pb-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center gap-3">
          <button
            className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
            onClick={() => navigate(`/groups/${groupId}`)}
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-discord-text text-base leading-tight">Members</h1>
            <p className="text-discord-muted text-xs">{group?.name} · {members.length} members</p>
          </div>
          {isAdmin && (
            <button
              className="flex items-center gap-1.5 discord-btn text-sm px-3 py-1.5 rounded-lg"
              onClick={() => setShowAddMember(true)}
            >
              <FiUserPlus size={14} /> Add
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search members..."
              className="discord-input pl-9 py-2 text-sm w-full rounded-full"
            />
            {searchQ && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted" onClick={() => setSearchQ('')}>
                <FiX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* Invite link */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover cursor-pointer hover:bg-discord-hover transition-colors"
              onClick={copyInvite}
            >
              <div className="w-10 h-10 rounded-full bg-discord-brand/15 flex items-center justify-center flex-shrink-0">
                <FiLink size={18} className="text-discord-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-discord-brand text-sm">Invite Members</p>
                <p className="text-discord-muted text-xs">{showCopied ? 'Copied!' : 'Tap to copy invite link'}</p>
              </div>
            </div>

            {/* Admin section */}
            {filteredMembers.some(m => m._id === group?.admin?._id || m._id === group?.admin) && (
              <div>
                <p className="px-4 pt-4 pb-1 text-[11px] text-discord-muted font-bold uppercase tracking-wider">Admin</p>
                {filteredMembers.filter(m => m._id === group?.admin?._id || m._id === group?.admin).map(m => (
                  <MemberRow
                    key={m._id}
                    m={m}
                    myId={myId}
                    isAdmin={isAdmin}
                    isThisAdmin={true}
                    onProfile={() => navigate(`/profile/${m.username}`)}
                    onKick={() => handleKickMember(m)}
                    onTransfer={() => handleTransferAdmin(m)}
                  />
                ))}
              </div>
            )}

            {/* Members section */}
            <p className="px-4 pt-4 pb-1 text-[11px] text-discord-muted font-bold uppercase tracking-wider">
              Members — {filteredMembers.filter(m => m._id !== group?.admin?._id && m._id !== group?.admin).length}
            </p>
            {filteredMembers.filter(m => m._id !== group?.admin?._id && m._id !== group?.admin).map(m => (
              <MemberRow
                key={m._id}
                m={m}
                myId={myId}
                isAdmin={isAdmin}
                isThisAdmin={false}
                onProfile={() => navigate(`/profile/${m.username}`)}
                onKick={() => handleKickMember(m)}
                onTransfer={() => handleTransferAdmin(m)}
              />
            ))}
          </div>
        )}

        {/* Leave Group */}
        {!isAdmin && (
          <div className="px-4 mt-4">
            <button
              className="flex items-center gap-2.5 w-full text-sm text-discord-red hover:bg-discord-red/10 px-4 py-3 rounded-xl transition-colors font-medium border border-discord-red/20"
              onClick={handleLeave}
            >
              <FiLogOut size={16} /> Leave Group
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="px-4 mt-4 text-center">
            <p className="text-discord-muted text-xs">As admin, transfer your role before leaving or go to Group Info to delete the group.</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMember(false)}>
          <div className="bg-discord-sidebar border border-white/8 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-discord-text mb-1">Add Member</h3>
            <p className="text-discord-muted text-sm mb-4">Enter their username to add them to the group.</p>
            <input
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              placeholder="Username"
              className="discord-input w-full mb-4"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
            />
            <div className="flex gap-2">
              <button className="discord-btn-ghost flex-1 py-2.5 rounded-xl text-sm" onClick={() => setShowAddMember(false)}>Cancel</button>
              <button className="discord-btn flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50" disabled={addLoading || !addUsername.trim()} onClick={handleAddMember}>
                {addLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function MemberRow({ m, myId, isAdmin, isThisAdmin, onProfile, onKick, onTransfer }) {
  const isMe = m._id === myId;
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover hover:bg-discord-hover transition-colors">
      <div className="cursor-pointer" onClick={onProfile}>
        <Avatar user={m} size={40} showStatus={!m.isSupa} supaRing={true} />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onProfile}>
        <div className="flex items-center gap-1.5">
          <p className={`font-semibold text-sm truncate ${m.isSupa ? 'supa-chat-name' : 'text-discord-text'}`}>{m.name || m.username}</p>
          {isMe && <span className="text-discord-muted text-xs">(you)</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isThisAdmin ? (
            <span className="text-discord-yellow text-[11px] flex items-center gap-0.5">
              <HiShieldCheck size={11} /> Admin
            </span>
          ) : (
            <span className="text-discord-muted text-xs">@{m.username}</span>
          )}
        </div>
      </div>
      {isAdmin && !isMe && (
        <div className="flex gap-1.5">
          {!isThisAdmin && (
            <button
              className="p-2 rounded-lg text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
              title="Make admin"
              onClick={onTransfer}
            >
              <FiShield size={15} />
            </button>
          )}
          <button
            className="p-2 rounded-lg text-discord-muted hover:text-discord-red hover:bg-discord-red/10 transition-colors"
            title="Remove from group"
            onClick={onKick}
          >
            <FiUserMinus size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
