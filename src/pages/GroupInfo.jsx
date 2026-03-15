import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUsers, FiLink, FiLogOut, FiTrash2, FiEdit2, FiCamera, FiX, FiCheck } from 'react-icons/fi';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import API from '../utils/api';
import ImageCropModal from '../components/ImageCropModal';

export default function GroupInfo({ currentUser, unreadCounts }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [picPreview, setPicPreview] = useState(null);
  const [picFile, setPicFile] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const picRef = useRef();

  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;

  useEffect(() => { fetchGroup(); }, [groupId]);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      const data = await API.getGroup(groupId);
      setGroup(data);
      setEditForm({ name: data.name || '', description: data.description || '' });
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
      if (picFile) fd.append('profilePicture', picFile);
      await API.updateGroup(groupId, fd);
      await fetchGroup();
      setEditing(false);
      setPicPreview(null);
      setPicFile(null);
    } catch (err) { alert(err.message); }
    finally { setEditLoading(false); }
  };

  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropSrc(url);
    }
    e.target.value = '';
  };

  const handleCropDone = (croppedFile, croppedUrl) => {
    setPicFile(croppedFile);
    setPicPreview(croppedUrl);
    setCropSrc(null);
  };

  const copyInvite = () => {
    if (group?.inviteCode) {
      navigator.clipboard?.writeText(`${window.location.origin}/#/join/${group.inviteCode}`);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await API.leaveGroup(groupId);
      navigate('/groups');
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this group? This cannot be undone.')) return;
    try {
      await API.deleteGroup(groupId);
      navigate('/groups');
    } catch (err) { alert(err.message); }
  };

  if (loading) {
    return (
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <>
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
          <h1 className="flex-1 font-bold text-discord-text text-base">Group Info</h1>
          {isAdmin && !editing && (
            <button
              className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => setEditing(true)}
            >
              <FiEdit2 size={17} />
            </button>
          )}
          {editing && (
            <button
              className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => { setEditing(false); setPicPreview(null); setPicFile(null); }}
            >
              <FiX size={17} />
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="p-4 space-y-5">
            {/* Picture */}
            <div className="flex flex-col items-center pt-2">
              <div className="relative cursor-pointer group" onClick={() => picRef.current?.click()}>
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-discord-dark border-2 border-white/10 shadow-lg">
                  {picPreview ? (
                    <img src={picPreview} alt="" className="w-full h-full object-cover" />
                  ) : group?.profilePicture ? (
                    <img src={API.getAvatarUrl(group.profilePicture, 96)} alt={group.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-discord-brand">
                      <FiUsers size={32} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiCamera size={20} className="text-white" />
                </div>
                <input ref={picRef} type="file" accept="image/*" className="hidden" onChange={handlePicChange} />
              </div>
              <p className="text-discord-muted text-xs mt-2">Tap to change photo</p>
            </div>

            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5 tracking-wider">Group Name</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="discord-input w-full"
                placeholder="Group name"
                required
              />
            </div>
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5 tracking-wider">Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="discord-input w-full resize-none"
                placeholder="What's this group about?"
                rows={3}
                maxLength={300}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="discord-btn-ghost flex-1 py-2.5 rounded-xl text-sm"
                onClick={() => { setEditing(false); setPicPreview(null); setPicFile(null); }}
              >
                Cancel
              </button>
              <button type="submit" disabled={editLoading} className="discord-btn flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Profile card */}
            <div className="flex flex-col items-center py-8 px-4 border-b border-discord-hover">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl mb-4">
                {group?.profilePicture ? (
                  <img src={API.getAvatarUrl(group.profilePicture, 96)} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-discord-brand">
                    <FiUsers size={32} className="text-white" />
                  </div>
                )}
              </div>
              <h2 className="font-bold text-discord-text text-xl">{group?.name}</h2>
              <p className="text-discord-muted text-sm mt-1">{group?.members?.length || 0} members</p>
            </div>

            {/* Description */}
            {group?.description && (
              <div className="mx-4 mt-4 p-4 rounded-xl bg-white/4 border border-white/6">
                <p className="text-discord-muted text-[11px] font-bold uppercase tracking-wider mb-2">About</p>
                <p className="text-discord-text text-sm whitespace-pre-wrap break-words">{group.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-white/6">
              <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
                <span className="text-discord-muted text-sm">Invite Link</span>
                <button
                  className="text-discord-brand text-sm font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  onClick={copyInvite}
                >
                  <FiLink size={13} />
                  {showCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {group?.createdAt && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-discord-muted text-sm">Created</span>
                  <span className="text-discord-text text-sm">{format(new Date(group.createdAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mx-4 mt-4 space-y-2">
              {!isAdmin && (
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-discord-red hover:bg-discord-red/10 border border-discord-red/20 transition-colors font-medium text-sm"
                  onClick={handleLeave}
                >
                  <FiLogOut size={16} /> Leave Group
                </button>
              )}
              {isAdmin && (
                <>
                  <p className="text-discord-muted text-xs px-1">As admin, transfer your role in Members before leaving, or delete the group below.</p>
                  <button
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-discord-red hover:bg-discord-red/10 border border-discord-red/20 transition-colors font-medium text-sm"
                    onClick={handleDelete}
                  >
                    <FiTrash2 size={16} /> Delete Group
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>

    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        circular={true}
        aspectRatio={1}
        onCrop={handleCropDone}
        onCancel={() => setCropSrc(null)}
      />
    )}
  </>
  );
}
