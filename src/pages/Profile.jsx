import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSettings, FiMessageSquare, FiUserPlus, FiUserCheck, FiEdit2, FiGrid, FiBookmark, FiUsers, FiCamera } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import API from '../utils/api';
import ImageCropModal from '../components/ImageCropModal';

export default function Profile({ currentUser, unreadCounts }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState('posts');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const fileRef = useRef();

  const isMyProfile = currentUser?.username === username;
  const myId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    fetchUser();
    fetchPosts();
  }, [username]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const data = await API.getUser(username);
      setUser(data);
      setFollowing(data.followers?.some(f => f._id === myId || f === myId) || false);
      if (isMyProfile) setEditForm({ name: data.name || '', bio: data.bio || '' });
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const fetchPosts = async () => {
    try {
      const data = await API.getUserPosts(username);
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch { setPosts([]); }
  };

  const handleFollow = async () => {
    try {
      const prev = following;
      setFollowing(!prev);
      setUser(u => ({ ...u, followers: prev ? u.followers.filter(f => f !== myId && f._id !== myId) : [...u.followers, myId] }));
      await API.followUser(username);
    } catch { fetchUser(); }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const fd = new FormData();
      if (editForm.name) fd.append('name', editForm.name);
      if (editForm.bio !== undefined) fd.append('bio', editForm.bio);
      if (editForm._file) fd.append('profilePicture', editForm._file);
      const data = await API.updateProfile(fd);
      const updated = data.user || data;
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
      setEditing(false);
    } catch (err) { alert(err.message); }
    finally { setEditLoading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCropSrc(url);
    }
    e.target.value = '';
  };

  const handleCropDone = (croppedFile, croppedUrl) => {
    setEditForm(f => ({ ...f, _file: croppedFile, _preview: croppedUrl }));
    setCropSrc(null);
  };

  const loadFollowers = async () => {
    const data = await API.getFollowers(username);
    setFollowersList(Array.isArray(data) ? data : data.followers || []);
    setShowFollowers(true);
  };

  const loadFollowing = async () => {
    const data = await API.getFollowing(username);
    setFollowingList(Array.isArray(data) ? data : data.following || []);
    setShowFollowing(true);
  };

  if (loading) return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!user) return null;

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className={`relative h-32 ${user.isSupa ? 'supa-profile-banner' : 'bg-gradient-to-r from-discord-brand to-purple-700'}`}>
          <div className="absolute -bottom-10 left-4">
            <Avatar user={user} size={80} showStatus={!user.isSupa} supaRing={true} className={user.isSupa ? '' : 'border-4 border-discord-bg rounded-full'} />
          </div>
        </div>

        {/* Profile Header */}
        <div className={`pt-14 px-4 pb-4 border-b border-discord-hover ${user.isSupa ? 'supa-profile-card' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl ${user.isSupa ? 'supa-username supa-name-container supa-sparkle' : 'font-bold text-discord-text'}`}>{user.name}</h1>
                {user.isVerified && (
                  <span className="supa-verified-tick" title="Verified">
                    <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  </span>
                )}
                {user.isSupa && <span className="supa-badge">SUPA</span>}
                {user.badge && <span className="text-base">{user.badge}</span>}
              </div>
              <p className="text-discord-muted text-sm">@{user.username}</p>
              {user.bio && <p className="text-discord-text text-sm mt-2 whitespace-pre-wrap break-words">{user.bio}</p>}
              <div className="flex items-center gap-4 mt-2">
                <button className="text-discord-muted text-sm hover:underline" onClick={loadFollowers}>
                  <span className="text-discord-text font-bold">{user.followers?.length || 0}</span> Followers
                </button>
                <button className="text-discord-muted text-sm hover:underline" onClick={loadFollowing}>
                  <span className="text-discord-text font-bold">{user.following?.length || 0}</span> Following
                </button>
                <span className="text-discord-muted text-xs">
                  Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : ''}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              {isMyProfile ? (
                <>
                  <button className="discord-btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-discord-hover text-sm font-semibold" onClick={() => setEditing(true)}>
                    <FiEdit2 size={13} /> Edit Profile
                  </button>
                  <button className="discord-btn-ghost p-2 rounded-full border border-discord-hover" onClick={() => navigate('/settings')}>
                    <FiSettings size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button className="discord-btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-discord-hover text-sm font-semibold" onClick={() => navigate(`/messages/${username}`)}>
                    <FiMessageSquare size={13} />
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${following ? 'border border-discord-hover text-discord-text hover:bg-discord-red/10 hover:text-discord-red hover:border-discord-red' : 'discord-btn'}`}
                    onClick={handleFollow}
                  >
                    {following ? <><FiUserCheck size={13} /> Following</> : <><FiUserPlus size={13} /> Follow</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-discord-sidebar rounded-lg w-full max-w-md shadow-2xl overflow-hidden">
              <div className="relative h-20 bg-gradient-to-r from-discord-brand to-purple-700">
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-discord-sidebar overflow-hidden bg-discord-dark">
                      {editForm._preview ? (
                        <img src={editForm._preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Avatar user={user} size={80} />
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiCamera size={18} className="text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-discord-brand rounded-full flex items-center justify-center border-2 border-discord-sidebar">
                      <FiCamera size={10} className="text-white" />
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>
              </div>
              <div className="pt-14 px-6 pb-6">
                <h2 className="text-lg font-bold text-discord-text mb-4 text-center">Edit Profile</h2>
                <p className="text-discord-muted text-xs text-center mb-4 -mt-2">Tap the photo to change your profile picture</p>
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Display Name</label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="discord-input w-full" />
                  </div>
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">About Me</label>
                    <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} className="discord-input w-full resize-none" rows={3} maxLength={500} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" className="discord-btn-ghost flex-1 py-2 rounded border border-discord-hover text-sm" onClick={() => setEditing(false)}>Cancel</button>
                    <button type="submit" disabled={editLoading} className="discord-btn flex-1 py-2 rounded text-sm disabled:opacity-50">
                      {editLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-discord-hover">
          {[{ id: 'posts', icon: FiGrid, label: 'Posts' }].map(t => (
            <button key={t.id} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`} onClick={() => setTab(t.id)}>
              <t.icon size={15} /> {t.label} {t.id === 'posts' && <span className="text-xs text-discord-muted">({posts.length})</span>}
            </button>
          ))}
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12 text-discord-muted">
            <FiGrid size={32} className="mx-auto mb-2 opacity-30" />
            <p>No posts yet</p>
          </div>
        ) : posts.map(post => (
          <PostCard key={post._id} post={post} currentUser={currentUser} onDelete={id => setPosts(p => p.filter(x => x._id !== id))} />
        ))}

        {/* Followers Modal */}
        {(showFollowers || showFollowing) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowFollowers(false); setShowFollowing(false); }}>
            <div className="bg-discord-sidebar rounded-lg w-full max-w-sm shadow-2xl max-h-96 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-discord-hover flex items-center justify-between">
                <h3 className="font-bold text-discord-text">{showFollowers ? 'Followers' : 'Following'}</h3>
                <button className="text-discord-muted hover:text-discord-text" onClick={() => { setShowFollowers(false); setShowFollowing(false); }}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1">
                {(showFollowers ? followersList : followingList).map(u => (
                  <div key={u._id || u.username} className="flex items-center gap-3 px-4 py-2.5 hover:bg-discord-hover cursor-pointer transition-colors" onClick={() => { setShowFollowers(false); setShowFollowing(false); navigate(`/profile/${u.username}`); }}>
                    <Avatar user={u} size={40} />
                    <div>
                      <p className="text-discord-text font-medium text-sm">{u.name}</p>
                      <p className="text-discord-muted text-xs">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="h-20 md:h-4" />
      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          circular={true}
          aspectRatio={1}
          onCrop={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </Layout>
  );
}
