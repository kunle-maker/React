import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSettings, FiMessageSquare, FiUserPlus, FiUserCheck, FiEdit2, FiGrid, FiCamera, FiFlag, FiSlash, FiUsers, FiZap, FiBookmark } from 'react-icons/fi';
import ReportModal from '../components/ReportModal';
import ProfilePictureModal from '../components/ProfilePictureModal';
import StoryViewer from '../components/StoryViewer';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { VerifiedBadge, SupaBadge, getStoredVerifiedBadgeStyle, setStoredVerifiedBadgeStyle } from '../components/UserBadge';
import VerificationBadgePicker, { getStoredSupaBadgeStyle } from '../components/VerificationBadgePicker';
import API from '../utils/api';
import ImageCropModal from '../components/ImageCropModal';
import { parseEmojisToHtml } from '../utils/emoji';

const TwemojiImg = ({ emoji, size = 14 }) => {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
  return <img src={`https://twemoji.maxcdn.com/v/latest/svg/${cp}.svg`} alt={emoji} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} draggable={false} />;
};

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
  const [showReport, setShowReport] = useState(false);
  const [showPicModal, setShowPicModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVerifPicker, setShowVerifPicker] = useState(false);
  const [showVerifPickerVerified, setShowVerifPickerVerified] = useState(false);
  const [supaStyleId, setSupaStyleId] = useState('red');
  const [verifiedStyleId, setVerifiedStyleId] = useState('blue');
  const [blocked, setBlocked] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [streak, setStreak] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const fileRef = useRef();

  const isMyProfile = currentUser?.username === username;
  const myId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    const isOwn = currentUser?.username === username;
    if (isOwn) {
      API.getMyStories().then(data => {
        const stories = Array.isArray(data) ? data : data?.stories || [];
        setUserStories(stories);
      }).catch(() => setUserStories([]));
    } else {
      API.getStoriesFeed().then(data => {
        const groups = Array.isArray(data) ? data : data?.stories || [];
        const group = groups.find(g => g.user?.username === username);
        setUserStories(group?.stories || []);
      }).catch(() => setUserStories([]));
    }
  }, [username, currentUser?.username]);

  useEffect(() => {
    fetchUser();
    fetchPosts();
    setSupaStyleId(getStoredSupaBadgeStyle(username));
    setVerifiedStyleId(getStoredVerifiedBadgeStyle(username) || 'blue');
    if (!isMyProfile) {
      API.getBlockedUsers().then(list => {
        const arr = Array.isArray(list) ? list : list?.blocked || [];
        setBlocked(arr.some(u => (u.username === username) || (u === username)));
      }).catch(() => {});
      API.getUserFriends(username).then(data => {
        const arr = Array.isArray(data) ? data : data?.friends || [];
        setFriends(arr);
      }).catch(() => {});
    } else {
      API.getLoginStreak().then(data => {
        if (data) setStreak(data.streak || data.currentStreak || data.count || null);
      }).catch(() => {});
      API.getFriends().then(data => {
        const arr = Array.isArray(data) ? data : data?.friends || [];
        setFriends(arr);
      }).catch(() => {});
    }
  }, [username]);

  const handleBlock = async () => {
    try {
      if (blocked) {
        await API.unblockUser(username);
        setBlocked(false);
      } else {
        await API.blockUser(username);
        setBlocked(true);
      }
    } catch (err) { alert(err.message); }
  };

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const data = isMyProfile ? await API.getFriends() : await API.getUserFriends(username);
      const arr = Array.isArray(data) ? data : data?.friends || [];
      setFriends(arr);
    } catch { setFriends([]); }
    finally { setFriendsLoading(false); }
  };

  const loadSaved = async () => {
    setSavedLoading(true);
    try {
      const data = await API.getBookmarks(1, 50);
      const arr = data?.posts || (Array.isArray(data) ? data : []);
      setSavedPosts(arr);
    } catch { setSavedPosts([]); }
    finally { setSavedLoading(false); }
  };

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
      const fresh = await API.getUser(username);
      if (fresh) {
        setUser(fresh);
        setFollowing(fresh.followers?.some(f => f._id === myId || f === myId) || false);
      }
    } catch { fetchUser(); }
  };

  const refreshCounts = async () => {
    try {
      API.clearCache(`/api/users/${username}`);
      const data = await API.getUser(username);
      if (data) {
        setUser(prev => ({ ...prev, followers: data.followers, following: data.following }));
      }
    } catch { }
  };

  useEffect(() => {
    const interval = setInterval(refreshCounts, 4000);
    return () => clearInterval(interval);
  }, [username]);

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
    API.clearCache(`/api/users/${username}/followers`);
    const data = await API.getFollowers(username);
    setFollowersList(Array.isArray(data) ? data : data.followers || []);
    setShowFollowers(true);
  };

  const loadFollowing = async () => {
    API.clearCache(`/api/users/${username}/following`);
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
      {storyViewerOpen && userStories.length > 0 && (
        <StoryViewer
          groups={[{ user, stories: userStories }]}
          startGroupIndex={0}
          currentUser={currentUser}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        <div className="relative" style={{ overflow: 'visible' }}>
          <div className={`h-32 relative overflow-hidden ${user.isSupa ? 'supa-profile-banner' : 'bg-gradient-to-r from-discord-brand to-purple-700'}`} />
          <div className="absolute left-4" style={{ bottom: 0, transform: 'translateY(50%)', zIndex: 10 }}>
            {userStories.length > 0 ? (
              <button
                className="focus:outline-none active:scale-95 transition-transform relative"
                onClick={() => setStoryViewerOpen(true)}
                aria-label="View stories"
              >
                <div className="p-0.5 rounded-full" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', padding: '2px' }}>
                  <div className="bg-discord-bg rounded-full p-0.5">
                    <Avatar user={user} size={76} showStatus={false} supaRing={false} className="block" />
                  </div>
                </div>
              </button>
            ) : (
              <button
                className="focus:outline-none active:scale-95 transition-transform"
                onClick={() => setShowPicModal(true)}
                aria-label="View profile picture"
              >
                <Avatar user={user} size={80} showStatus={!user.isSupa} supaRing={true} className={user.isSupa ? '' : 'border-4 border-discord-bg rounded-full'} />
              </button>
            )}
          </div>
        </div>

        {/* Profile Header */}
        <div className={`pt-14 px-4 pb-4 border-b border-discord-hover ${user.isSupa ? 'supa-profile-card' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl ${user.isSupa ? 'supa-username supa-name-container supa-sparkle' : 'font-bold text-discord-text'}`} dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(user.name) }} />
                {user.isVerified && (
                  isMyProfile ? (
                    <button
                      className="focus:outline-none active:scale-90 transition-transform"
                      onClick={() => setShowVerifPickerVerified(true)}
                      title="Customize your Verified badge"
                    >
                      <VerifiedBadge size={20} username={user.username} styleId={verifiedStyleId} />
                    </button>
                  ) : (
                    <VerifiedBadge size={20} username={user.username} />
                  )
                )}
                {user.isSupa && (
                  isMyProfile ? (
                    <button
                      className="focus:outline-none active:scale-90 transition-transform"
                      onClick={() => setShowVerifPicker(true)}
                      title="Customize your SUPA badge"
                    >
                      <SupaBadge size={20} username={user.username} styleId={supaStyleId} />
                    </button>
                  ) : (
                    <SupaBadge size={20} username={user.username} />
                  )
                )}
              </div>
              <p className="text-discord-muted text-sm">@{user.username}</p>
              {user.bio && (
                <p
                  className="text-discord-text text-sm mt-2 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(user.bio) }}
                />
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <button className="text-discord-muted text-sm hover:underline" onClick={loadFollowers}>
                  <span className="text-discord-text font-bold">{user.followers?.length || 0}</span> Followers
                </button>
                <button className="text-discord-muted text-sm hover:underline" onClick={loadFollowing}>
                  <span className="text-discord-text font-bold">{user.following?.length || 0}</span> Following
                </button>
                {friends.length > 0 && (
                  <button className="text-discord-muted text-sm hover:underline" onClick={() => setTab('friends')}>
                    <span className="text-discord-text font-bold">{friends.length}</span> Friends
                  </button>
                )}
                <span className="text-discord-muted text-xs">
                  Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : ''}
                </span>
                {isMyProfile && streak && (
                  <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2 py-0.5 rounded-full">
                    <FiZap size={11} /> {streak} day streak
                  </span>
                )}
                {user.level != null && (
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-400/10 border border-indigo-400/30 px-2 py-0.5 rounded-full" title={`${user.xp || 0} XP`}>
                    <TwemojiImg emoji="⚡" size={12} /> Lv.{user.level}
                  </span>
                )}
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
                  {!blocked && (
                    <button
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${following ? 'border border-discord-hover text-discord-text hover:bg-discord-red/10 hover:text-discord-red hover:border-discord-red' : 'discord-btn'}`}
                      onClick={handleFollow}
                    >
                      {following ? <><FiUserCheck size={13} /> Following</> : <><FiUserPlus size={13} /> Follow</>}
                    </button>
                  )}
                  <button
                    className={`p-2 rounded-full border transition-all ${blocked ? 'border-discord-red text-discord-red bg-discord-red/10 hover:bg-discord-red/20' : 'border-discord-hover text-discord-muted hover:text-discord-red hover:border-discord-red/50 hover:bg-discord-red/10'}`}
                    title={blocked ? 'Unblock user' : 'Block user'}
                    onClick={handleBlock}
                  >
                    <FiSlash size={14} />
                  </button>
                  <button
                    className="p-2 rounded-full border border-discord-hover text-discord-muted hover:text-orange-400 hover:border-orange-400/50 hover:bg-orange-400/10 transition-all"
                    title="Report user"
                    onClick={() => setShowReport(true)}
                  >
                    <FiFlag size={14} />
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
          {[
            { id: 'posts', icon: FiGrid, label: 'Posts' },
            { id: 'friends', icon: FiUsers, label: 'Friends' },
            ...(isMyProfile ? [{ id: 'saved', icon: FiBookmark, label: 'Saved' }] : []),
          ].map(t => (
            <button
              key={t.id}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-discord-brand text-discord-brand' : 'border-transparent text-discord-muted hover:text-discord-text'}`}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'friends') loadFriends();
                if (t.id === 'saved') loadSaved();
              }}
            >
              <t.icon size={15} /> {t.label}
              {t.id === 'posts' && <span className="text-xs text-discord-muted">({posts.length})</span>}
              {t.id === 'friends' && <span className="text-xs text-discord-muted">({friends.length})</span>}
            </button>
          ))}
        </div>

        {/* Posts */}
        {tab === 'posts' && (posts.length === 0 ? (
          <div className="text-center py-12 text-discord-muted">
            <FiGrid size={32} className="mx-auto mb-2 opacity-30" />
            <p>No posts yet</p>
          </div>
        ) : posts.map(post => (
          <PostCard key={post._id} post={post} currentUser={currentUser} onDelete={id => setPosts(p => p.filter(x => x._id !== id))} />
        )))}

        {/* Friends */}
        {tab === 'friends' && (
          <div className="py-2">
            {friendsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 text-discord-muted">
                <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
                <p>No mutual friends yet</p>
              </div>
            ) : friends.map(f => {
              const u = f.user || f;
              return (
                <div
                  key={u._id || u.username}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-discord-hover cursor-pointer transition-colors"
                  onClick={() => navigate(`/profile/${u.username}`)}
                >
                  <Avatar user={u} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="text-discord-text font-semibold text-sm truncate">{u.name}</p>
                    <p className="text-discord-muted text-xs">@{u.username}</p>
                  </div>
                  <button
                    className="discord-btn-ghost px-3 py-1 rounded-full text-xs border border-discord-hover"
                    onClick={e => { e.stopPropagation(); navigate(`/messages/${u.username}`); }}
                  >
                    Message
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Saved Posts */}
        {tab === 'saved' && (
          <div className="py-2">
            {savedLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-12 text-discord-muted">
                <FiBookmark size={32} className="mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-discord-text mb-1">No saved posts yet</p>
                <p className="text-sm">Bookmark posts to find them here</p>
              </div>
            ) : savedPosts.map(post => (
              <PostCard key={post._id} post={post} currentUser={currentUser} onDelete={id => setSavedPosts(p => p.filter(x => x._id !== id))} />
            ))}
          </div>
        )}

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

      {showReport && user && (
        <ReportModal
          type="user"
          targetId={user._id}
          targetName={user.name || user.username}
          onClose={() => setShowReport(false)}
        />
      )}

      {showPicModal && user && (
        <ProfilePictureModal
          user={user}
          isOwnProfile={isMyProfile}
          onClose={() => setShowPicModal(false)}
          onChangePhoto={() => { setEditing(true); setTimeout(() => fileRef.current?.click(), 150); }}
          onMessage={() => navigate(`/messages/${user.username}`)}
          onCopyLink={() => {
            const url = `${window.location.origin}/#/profile/${user.username}`;
            navigator.clipboard?.writeText(url).catch(() => {});
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          }}
        />
      )}

      {copiedLink && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-discord-dark border border-white/10 text-discord-text text-xs px-4 py-2 rounded-full shadow-xl backdrop-blur-xl pointer-events-none">
          Link copied!
        </div>
      )}

      {showVerifPicker && user?.isSupa && isMyProfile && (
        <VerificationBadgePicker
          username={user.username}
          badgeType="supa"
          currentStyleId={supaStyleId}
          onSelect={(styleId) => {
            setSupaStyleId(styleId);
            setShowVerifPicker(false);
          }}
          onClose={() => setShowVerifPicker(false)}
        />
      )}

      {showVerifPickerVerified && user?.isVerified && isMyProfile && (
        <VerificationBadgePicker
          username={user.username}
          badgeType="verified"
          currentStyleId={verifiedStyleId}
          onSelect={(styleId) => {
            setVerifiedStyleId(styleId);
            setStoredVerifiedBadgeStyle(user.username, styleId);
            setShowVerifPickerVerified(false);
          }}
          onClose={() => setShowVerifPickerVerified(false)}
        />
      )}

    </Layout>
  );
}
