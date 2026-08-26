import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSettings, FiMessageSquare, FiUserPlus, FiUserCheck, FiEdit2, FiGrid, FiCamera, FiFlag, FiSlash, FiUsers, FiZap, FiBookmark, FiLock, FiClock, FiMapPin, FiLink, FiCheck, FiX, FiVideo, FiFileText, FiGift, FiExternalLink } from 'react-icons/fi';
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
import { showToast } from '../utils/toast';
import ImageCropModal from '../components/ImageCropModal';
import { parseEmojisToHtml } from '../utils/emoji';

function twemojiUrl(emoji) {
  const cps = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(cp => parseInt(cp, 16) !== 0xfe0f);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cps.join('-')}.png`;
}
function TwemojiImg({ emoji, size = 24, className = '' }) {
  return <img src={twemojiUrl(emoji)} alt={emoji} width={size} height={size} draggable={false} className={`select-none object-contain inline-block ${className}`} loading="lazy" />;
}

const TwemojiImgLegacy = ({ emoji, size = 14 }) => {
  const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
  return <img src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cp}.png`} alt={emoji} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} draggable={false} />;
};

const BOT_PROFILES = {
  VesselBot: {
    bio: "Your ultimate game rival on VesselX. I challenge players across Tic-Tac-Toe and more — from casual Easy mode to the unbeatable Hard difficulty. Think you can beat me? 🤖",
    badge: "Game AI",
    color: "text-discord-brand",
  },
  VesselAI: {
    bio: "Your intelligent companion on VesselX. I help you write, think, create, and discover — all in one place. Powered by cutting-edge AI. Ask me anything. ⚡",
    badge: "AI Assistant",
    color: "text-purple-400",
  },
  VesselMod: {
    bio: "Keeping VesselX safe and welcoming for everyone. I manage reports, enforce community guidelines, and protect users across the platform. Safety is my purpose. 🛡️",
    badge: "Moderator Bot",
    color: "text-orange-400",
  },
  Moderator: {
    bio: "Keeping VesselX safe and welcoming for everyone. I manage reports, enforce community guidelines, and protect users across the platform. Safety is my purpose. 🛡️",
    badge: "Moderator Bot",
    color: "text-orange-400",
  },
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
  const [editForm, setEditForm] = useState({ name: '', bio: '', website: '', location: '' });
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [postsHidden, setPostsHidden] = useState(false);
  const [followRequests, setFollowRequests] = useState([]);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  // Gift Supa
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftPlan, setGiftPlan] = useState('monthly');
  const [giftLoading, setGiftLoading] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showPicModal, setShowPicModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVerifPicker, setShowVerifPicker] = useState(false);
  const [bioLinks, setBioLinks] = useState([]);
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
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState(null);
  const [coverCropForEdit, setCoverCropForEdit] = useState(false);
  const fileRef = useRef();
  const coverFileRef = useRef();
  const directCoverRef = useRef();

  const isMyProfile = currentUser?.username === username;
  const myId = currentUser?._id || currentUser?.id;
  const isBotProfile = BOT_PROFILES[username] || null;

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
    // Load bio links
    API.getUserBioLinks(username).then(data => {
      setBioLinks(Array.isArray(data) ? data : data?.links || []);
    }).catch(() => setBioLinks([]));
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

  const handleGiftSupa = async () => {
    setGiftLoading(true);
    try {
      const data = await API.giftSupa(giftPlan, username);
      const url = data?.paymentLink || data?.link || data?.payment_link;
      if (url) {
        setShowGiftModal(false);
        window.location.href = url;
      } else {
        showToast('Gift initiated! Check your payment details.', { type: 'success' });
        setShowGiftModal(false);
      }
    } catch (err) {
      showToast(err.message || 'Failed to initiate gift', { type: 'error' });
    } finally { setGiftLoading(false); }
  };

  const handleBlock = async () => {    try {
      if (blocked) {
        await API.unblockUser(username);
        setBlocked(false);
      } else {
        await API.blockUser(username);
        setBlocked(true);
      }
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
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
      const data = await API.getBookmarkedPosts(1, 50);
      const arr = data?.posts || (Array.isArray(data) ? data : []);
      setSavedPosts(arr);
    } catch {
      try {
        const data = await API.getBookmarks(1, 50);
        const arr = data?.posts || (Array.isArray(data) ? data : []);
        setSavedPosts(arr);
      } catch { setSavedPosts([]); }
    }
    finally { setSavedLoading(false); }
  };

  const fetchUser = async () => {
    setLoading(true);
    try {
      const data = await API.getUser(username);
      setUser(data);
      setFollowing(data.isFollowing ?? data.followers?.some(f => f._id === myId || f === myId) ?? false);
      setHasPendingRequest(data.hasPendingRequest || false);
      setIsPrivate(data.isPrivate || false);
      if (isMyProfile) {
        setEditForm({ name: data.name || '', bio: data.bio || '', website: data.website || '', location: data.location || '' });
        if (data.followRequestCount > 0) {
          API.getFollowRequests().then(res => {
            setFollowRequests(Array.isArray(res.followRequests) ? res.followRequests : []);
          }).catch(() => {});
        }
      }
    } catch { navigate('/'); }
    finally { setLoading(false); }
  };

  const fetchPosts = async () => {
    try {
      const data = await API.getUserPosts(username);
      const postList = data.posts || (Array.isArray(data) ? data : []);
      setPostsHidden(data.postsHidden || false);
      setPosts(postList);
    } catch { setPosts([]); }
  };

  const handleFollow = async () => {
    try {
      const data = await API.followUser(username);
      if (data.requested) {
        setHasPendingRequest(true);
        setFollowing(false);
      } else if (data.following === false) {
        setHasPendingRequest(false);
        setFollowing(false);
        setUser(u => ({ ...u, followers: (u.followers || []).filter(f => f !== myId && f._id !== myId) }));
      } else {
        setHasPendingRequest(false);
        setFollowing(true);
        setUser(u => ({ ...u, followers: [...(u.followers || []), myId] }));
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

  const handleDirectCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setShowCoverMenu(false);
    setCoverCropSrc(URL.createObjectURL(file));
  };

  const handleCoverCropDone = async (croppedFile) => {
    setCoverCropSrc(null);
    if (coverCropForEdit) {
      setCoverCropForEdit(false);
      const previewUrl = URL.createObjectURL(croppedFile);
      setEditForm(f => ({ ...f, _coverFile: croppedFile, _coverPreview: previewUrl }));
      setEditing(true);
      return;
    }
    setCoverUploading(true);
    try {
      const data = await API.updateCoverPhoto(croppedFile);
      const newCover = data.coverPhoto;
      setUser(prev => ({ ...prev, coverPhoto: newCover }));
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, coverPhoto: newCover }));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: { ...user, coverPhoto: newCover } }));
      showToast('Cover photo updated!', { type: 'success' });
    } catch (err) {
      showToast(err.message || 'Failed to update cover photo', { type: 'error' });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    setShowCoverMenu(false);
    setCoverUploading(true);
    try {
      await API.removeCoverPhoto();
      setUser(prev => ({ ...prev, coverPhoto: null }));
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, coverPhoto: null }));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: { ...user, coverPhoto: null } }));
      showToast('Cover photo removed', { type: 'success' });
    } catch (err) {
      showToast(err.message || 'Failed to remove cover photo', { type: 'error' });
    } finally {
      setCoverUploading(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const fd = new FormData();
      if (editForm.name) fd.append('name', editForm.name);
      if (editForm.bio !== undefined) fd.append('bio', editForm.bio);
      if (editForm.website !== undefined) fd.append('website', editForm.website);
      if (editForm.location !== undefined) fd.append('location', editForm.location);
      if (editForm._file) fd.append('profilePicture', editForm._file);
      const data = await API.updateProfile(fd);
      let updated = data.user || data;

      if (editForm._coverFile) {
        const coverData = await API.updateCoverPhoto(editForm._coverFile);
        if (coverData.coverPhoto) {
          updated = { ...updated, coverPhoto: coverData.coverPhoto };
        }
      }

      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
      setEditing(false);
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
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
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} hideNav={editing || !!isBotProfile}>
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
          <div
            className={`h-36 relative overflow-hidden ${user.isSupa ? 'supa-profile-banner' : !user.coverPhoto ? 'bg-gradient-to-r from-discord-brand to-purple-700' : 'bg-black'}`}
            onClick={isMyProfile ? () => setShowCoverMenu(true) : undefined}
            style={isMyProfile ? { cursor: 'pointer' } : undefined}
          >
            {user.coverPhoto && (
              <img src={API.getMediaUrl(user.coverPhoto)} alt="" className="w-full h-full object-cover" />
            )}
            {isMyProfile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group">
                {coverUploading ? (
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-full text-white text-sm font-bold">
                    <FiCamera size={14} />
                    {user.coverPhoto ? 'Change cover' : 'Add cover photo'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cover photo context menu */}
          {showCoverMenu && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" onClick={() => setShowCoverMenu(false)}>
              <div className="w-full max-w-sm bg-discord-sidebar rounded-t-3xl p-3 space-y-1.5 animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-discord-hover rounded-full mx-auto mb-4" />
                <button
                  onClick={() => { directCoverRef.current?.click(); }}
                  className="w-full py-2.5 text-left px-4 text-discord-text text-sm font-bold hover:bg-discord-hover rounded-xl flex items-center gap-3"
                >
                  <FiCamera size={16} /> {user.coverPhoto ? 'Change cover photo' : 'Add cover photo'}
                </button>
                {user.coverPhoto && (
                  <button
                    onClick={handleRemoveCoverPhoto}
                    className="w-full py-2.5 text-left px-4 text-red-400 text-sm font-bold hover:bg-red-400/10 rounded-xl flex items-center gap-3"
                  >
                    <FiSlash size={16} /> Remove cover photo
                  </button>
                )}
                <button onClick={() => setShowCoverMenu(false)} className="w-full py-2.5 text-center text-discord-muted text-sm font-bold mt-2">Cancel</button>
              </div>
            </div>
          )}
          <input ref={directCoverRef} type="file" accept="image/*" className="hidden" onChange={handleDirectCoverUpload} />
          <div className="absolute left-4" style={{ bottom: 0, transform: 'translateY(50%)', zIndex: 10 }}>
            {userStories.length > 0 ? (
              <button
                className="focus:outline-none active:scale-95 transition-transform relative"
                onClick={() => setStoryViewerOpen(true)}
                aria-label="View stories"
              >
                <div className="rounded-full" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', padding: '3px' }}>
                  <div className="bg-discord-bg rounded-full" style={{ padding: '2px' }}>
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
        <div className={`pt-14 px-4 pb-5 border-b border-discord-hover ${user.isSupa ? 'supa-profile-card' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            {/* Left: name, username, bio, stats */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl break-words min-w-0 max-w-full ${user.isSupa ? 'supa-username supa-name-container supa-sparkle' : 'font-bold text-discord-text'}`} dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(user.name) }} />
                {user.isVerified && (
                  isMyProfile ? (
                    <button className="focus:outline-none active:scale-90 transition-transform" onClick={() => setShowVerifPickerVerified(true)} title="Customize your Verified badge">
                      <VerifiedBadge size={20} username={user.username} styleId={verifiedStyleId} />
                    </button>
                  ) : (
                    <VerifiedBadge size={20} username={user.username} />
                  )
                )}
                {user.isSupa && (
                  isMyProfile ? (
                    <button className="focus:outline-none active:scale-90 transition-transform" onClick={() => setShowVerifPicker(true)} title="Customize your SUPA badge">
                      <SupaBadge size={20} username={user.username} styleId={supaStyleId} />
                    </button>
                  ) : (
                    <SupaBadge size={20} username={user.username} />
                  )
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-discord-muted text-sm">@{user.username}</p>
                {(user.isPrivate || isPrivate) && (
                  <span className="text-[10px] font-bold bg-discord-brand/10 border border-discord-brand/20 text-discord-brand px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <FiLock size={9} /> Private
                  </span>
                )}
              </div>
              {isBotProfile && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border mt-1 ${isBotProfile.color} border-current/30 bg-current/5`}>
                  🤖 {isBotProfile.badge}
                </span>
              )}
              {(isBotProfile?.bio || user.bio) && (
                <p className="text-discord-text text-sm mt-2 whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(isBotProfile?.bio || user.bio) }} />
              )}
              {(user.website || user.location) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {user.location && (
                    <span className="flex items-center gap-1 text-discord-muted text-xs">
                      <TwemojiImg emoji="📍" size={12} /> {user.location}
                    </span>
                  )}
                  {user.website && (
                    <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-discord-brand text-xs hover:underline">
                      <TwemojiImg emoji="🔗" size={12} /> {user.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              )}
              {/* Bio links */}
              {bioLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {bioLinks.map((link, i) => (
                    <a key={i} href={link.url?.startsWith('http') ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-discord-sidebar border border-discord-hover rounded-xl px-3 py-1.5 text-xs text-discord-brand hover:bg-discord-hover transition-colors">
                      <FiExternalLink size={11} />
                      {link.title || link.url}
                    </a>
                  ))}
                </div>
              )}
              {isMyProfile && followRequests.length > 0 && (
                <button
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold text-discord-brand bg-discord-brand/10 border border-discord-brand/20 px-3 py-1.5 rounded-full hover:bg-discord-brand/20 transition-colors"
                  onClick={() => setShowFollowRequests(true)}
                >
                  <FiUserPlus size={12} /> {followRequests.length} follow request{followRequests.length !== 1 ? 's' : ''}
                </button>
              )}
              {/* Followers / Following / Friends (hidden for bots) */}
              {user.isBot ? (
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {user.monthlyActiveUsers != null && (
                    <span className="text-discord-muted text-sm">
                      <span className="text-discord-text font-bold">{user.monthlyActiveUsers}</span> Monthly active
                    </span>
                  )}
                  {user.totalUsers != null && (
                    <span className="text-discord-muted text-sm">
                      <span className="text-discord-text font-bold">{user.totalUsers}</span> Total users
                    </span>
                  )}
                  <span className="text-discord-muted text-xs">
                    Joined {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : ''}
                  </span>
                </div>
              ) : (
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
                </div>
              )}
              {/* Streak + Level badges */}
              {(streak || user.level != null) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isMyProfile && streak && (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2.5 py-1 rounded-full">
                      <TwemojiImg emoji="🔥" size={12} /> {streak} day streak
                    </span>
                  )}
                  {user.level != null && (
                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-400 bg-indigo-400/10 border border-indigo-400/30 px-2.5 py-1 rounded-full" title={`${user.xp || 0} XP`}>
                      <TwemojiImg emoji="⚡" size={12} /> Lv.{user.level}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex-shrink-0 flex flex-col items-end gap-2 mt-1">
              {isMyProfile ? (
                <>
                  <button
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-bold text-white transition-all active:scale-95 shadow-sm whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5865f2 100%)' }}
                    onClick={() => setEditing(true)}
                  >
                    <FiEdit2 size={13} /> Edit Profile
                  </button>
                  <button
                    className="discord-btn-ghost p-2 rounded-full border border-discord-hover hover:border-discord-brand/40 hover:text-discord-brand transition-all"
                    onClick={() => navigate('/settings')}
                    title="Settings"
                  >
                    <FiSettings size={16} />
                  </button>
                </>
              ) : user.isBot ? (
                <button
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white transition-all active:scale-95 shadow-sm whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5865f2 100%)' }}
                  onClick={() => navigate(`/messages/chat/${username}`)}
                >
                  <FiMessageSquare size={13} /> Open Chat
                </button>
              ) : (
                <>
                  {!blocked && (
                    <button
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95 whitespace-nowrap ${
                        following
                          ? 'border border-discord-hover text-discord-text hover:bg-discord-red/10 hover:text-discord-red hover:border-discord-red'
                          : hasPendingRequest
                            ? 'border border-discord-muted text-discord-muted'
                            : 'text-white shadow-sm'
                      }`}
                      style={!following && !hasPendingRequest ? { background: 'linear-gradient(135deg, #7c3aed 0%, #5865f2 100%)' } : {}}
                      onClick={handleFollow}
                    >
                      {following
                        ? <><FiUserCheck size={13} /> Following</>
                        : hasPendingRequest
                          ? <><FiClock size={13} /> Requested</>
                          : <><FiUserPlus size={13} /> Follow</>
                      }
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button
                      className="discord-btn-ghost p-2 rounded-full border border-discord-hover text-discord-muted hover:text-discord-brand hover:border-discord-brand/50 transition-all"
                      onClick={() => navigate(`/messages/chat/${username}`)}
                      title="Send message"
                    >
                      <FiMessageSquare size={14} />
                    </button>
                    <button
                      className="discord-btn-ghost p-2 rounded-full border border-discord-hover text-discord-muted hover:text-yellow-400 hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-all"
                      title="Gift Supa"
                      onClick={() => setShowGiftModal(true)}
                    >
                      <FiGift size={14} />
                    </button>
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
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-discord-sidebar rounded-lg w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="relative h-28 bg-gradient-to-r from-discord-brand to-purple-700">
                {editForm._coverPreview ? (
                  <img src={editForm._coverPreview} alt="" className="w-full h-full object-cover" />
                ) : user.coverPhoto && (
                  <img src={API.getMediaUrl(user.coverPhoto)} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70"
                  onClick={() => coverFileRef.current?.click()}
                  title="Change cover photo"
                >
                  <FiCamera size={16} />
                </button>
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  e.target.value = '';
                  setCoverCropForEdit(true);
                  setEditing(false);
                  setCoverCropSrc(URL.createObjectURL(file));
                }} />

                <div className="absolute -bottom-10 left-6">
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
                <h2 className="text-lg font-bold text-discord-text mb-4">Edit Profile</h2>
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">Display Name</label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="discord-input w-full" />
                  </div>
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5">About Me</label>
                    <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} className="discord-input w-full resize-none" rows={3} maxLength={500} />
                  </div>
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5 flex items-center gap-1"><FiMapPin size={11} /> Location</label>
                    <input value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} className="discord-input w-full" placeholder="City, Country" maxLength={100} />
                  </div>
                  <div>
                    <label className="block text-discord-muted text-xs font-bold uppercase mb-1.5 flex items-center gap-1"><FiLink size={11} /> Website</label>
                    <input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="discord-input w-full" placeholder="https://yoursite.com" maxLength={200} type="url" />
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
            { id: 'stats', icon: FiZap, label: 'Stats' },
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

        {/* Posts Grid */}
        {tab === 'posts' && (postsHidden && !isMyProfile ? (
          <div className="text-center py-16 text-discord-muted">
            <FiLock size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-discord-text">This account is private</p>
            <p className="text-sm mt-1">Follow to see their posts.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-discord-muted">
            <FiGrid size={32} className="mx-auto mb-2 opacity-30" />
            <p>No posts yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', padding: '2px' }}>
            {posts.map(post => {
              const firstMedia = post.media?.[0];
              const isVideo = firstMedia?.type === 'video';
              const hasMedia = !!firstMedia;
              const mediaUrl = firstMedia?.url
                ? (firstMedia.url.startsWith('http') ? firstMedia.url : `https://vessel-xbackendzip--ayokunleayodele.replit.app${firstMedia.url}`)
                : null;
              return (
                <div
                  key={post._id}
                  onClick={() => navigate(`/post/${post._id}`)}
                  style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', cursor: 'pointer', background: '#111318' }}
                >
                  {hasMedia ? (
                    isVideo ? (
                      <video
                        src={mediaUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#16181f' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                        {post.content}
                      </p>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                  />

                  {/* Video icon */}
                  {isVideo && (
                    <div style={{ position: 'absolute', top: '6px', right: '6px', color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                      <FiVideo size={14} />
                    </div>
                  )}

                  {/* Multiple media indicator */}
                  {(post.media?.length ?? 0) > 1 && (
                    <div style={{ position: 'absolute', top: '6px', right: isVideo ? '26px' : '6px', width: '14px', height: '14px', color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm4-4h12a4 4 0 014 4v10a2 2 0 01-2 2V6a2 2 0 00-2-2H6a2 2 0 01-2-2z"/></svg>
                    </div>
                  )}

                  {/* Pinned badge — TikTok style */}
                  {post.isPinned && (
                    <div style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      background: 'rgba(88, 101, 242, 0.9)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}>
                      <FiMapPin size={8} />
                      Pinned
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

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

        {/* Stats */}
        {tab === 'stats' && (
          <div className="p-4 space-y-6">
            <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-discord-brand/20 flex items-center justify-center">
                  <FiZap size={28} className="text-discord-brand" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-discord-text">Level {user?.level || 1}</h3>
                  <p className="text-discord-muted text-sm font-semibold">{user?.xp || 0} Total XP Earned</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-discord-muted">
                  <span>Current Progress</span>
                  <span>{Math.round(((user?.xp || 0) % 1000) / 10)}%</span>
                </div>
                <div className="h-3 bg-discord-dark rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-discord-brand to-purple-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${(user?.xp || 0) % 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-discord-muted text-right italic font-medium">Keep playing to level up!</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl p-4 text-center group hover:border-discord-brand/50 transition-colors shadow-lg">
                <div className="mb-2 flex justify-center"><TwemojiImg emoji="🔤" size={32} /></div>
                <p className="text-2xl font-black text-discord-text leading-tight">{user?.gameStats?.wordSprintWins || 0}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-discord-muted mt-1">Word Sprint Wins</p>
              </div>
              <div className="bg-discord-hover/30 border border-discord-hover rounded-2xl p-4 text-center group hover:border-discord-brand/50 transition-colors shadow-lg">
                <div className="mb-2 flex justify-center"><TwemojiImg emoji="🎭" size={32} /></div>
                <p className="text-2xl font-black text-discord-text leading-tight">{user?.gameStats?.emojiTriviaWins || 0}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-discord-muted mt-1">Emoji Trivia Wins</p>
              </div>
            </div>

            <div className="bg-discord-hover/20 border border-discord-hover/50 rounded-2xl p-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-discord-muted mb-4 px-1">Game Activity</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-discord-text/80">Total XP Earned</span>
                  <span className="text-sm font-black text-discord-brand">{user?.gameStats?.totalXpEarned || user?.xp || 0}</span>
                </div>
                <div className="h-px bg-discord-hover" />
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-discord-text/80">Word Sprint Played</span>
                  <span className="text-sm font-black text-discord-text">{user?.gameStats?.wordSprintPlayed || 0}</span>
                </div>
                <div className="h-px bg-discord-hover" />
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-bold text-discord-text/80">Emoji Trivia Played</span>
                  <span className="text-sm font-black text-discord-text">{user?.gameStats?.emojiTriviaPlayed || 0}</span>
                </div>
              </div>
            </div>
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
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', padding: '2px' }}>
                {savedPosts.map(post => {
                  const firstMedia = post.media?.[0];
                  const isVideo = firstMedia?.type === 'video';
                  const hasMedia = !!firstMedia;
                  const mediaUrl = firstMedia?.url
                    ? (firstMedia.url.startsWith('http') ? firstMedia.url : `https://vessel-xbackendzip--ayokunleayodele.replit.app${firstMedia.url}`)
                    : null;
                  return (
                    <div
                      key={post._id}
                      onClick={() => navigate(`/post/${post._id}`)}
                      style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', cursor: 'pointer', background: '#111318' }}
                    >
                      {hasMedia ? (
                        isVideo ? (
                          <video
                            src={mediaUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#16181f' }}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                            {post.content}
                          </p>
                        </div>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                      />
                      {isVideo && (
                        <div style={{ position: 'absolute', top: '6px', right: '6px', color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                          <FiVideo size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      {coverCropSrc && (
        <ImageCropModal
          src={coverCropSrc}
          circular={false}
          aspectRatio={16 / 9}
          onCrop={handleCoverCropDone}
          onCancel={() => setCoverCropSrc(null)}
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

      {/* Gift Supa Modal */}
      {showGiftModal && user && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowGiftModal(false)}>
          <div className="bg-discord-sidebar rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 flex items-center justify-center flex-shrink-0">
                    <FiGift size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-discord-text">Gift Supa to @{username}</h3>
                    <p className="text-discord-muted text-xs">Send them the premium VesselX experience</p>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  {[
                    { id: 'monthly', label: 'Monthly', price: '₦1,100' },
                    { id: 'yearly', label: 'Yearly', price: '₦12,000', badge: 'Best value' },
                  ].map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setGiftPlan(plan.id)}
                      className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all flex items-center justify-between ${giftPlan === plan.id ? 'border-discord-brand bg-discord-brand/5' : 'border-discord-hover hover:border-discord-hover/80'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${giftPlan === plan.id ? 'border-discord-brand bg-discord-brand' : 'border-discord-muted'}`} />
                        <span className="font-semibold text-discord-text text-sm">{plan.label}</span>
                        {plan.badge && <span className="text-[10px] bg-discord-brand text-white px-1.5 py-0.5 rounded-full font-bold">{plan.badge}</span>}
                      </div>
                      <span className="text-discord-brand font-bold text-sm">{plan.price}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleGiftSupa}
                  disabled={giftLoading}
                  className="discord-btn w-full py-3 font-bold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {giftLoading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><FiGift size={15} /> Send Gift</>}
                </button>
                <button onClick={() => setShowGiftModal(false)} className="w-full text-center text-discord-muted text-sm mt-3 hover:underline">Cancel</button>
          </div>
        </div>
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

      {showFollowRequests && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowFollowRequests(false)}>
          <div className="bg-discord-sidebar rounded-xl w-full max-w-sm shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-discord-hover">
              <h2 className="text-discord-text font-bold">Follow Requests</h2>
              <button onClick={() => setShowFollowRequests(false)} className="text-discord-muted hover:text-discord-text"><FiX size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {followRequests.length === 0 ? (
                <div className="text-center py-10 text-discord-muted text-sm">No pending requests</div>
              ) : followRequests.map(req => {
                const u = req.user || req;
                return (
                  <div key={u._id || u.username} className="flex items-center gap-3 px-4 py-3 border-b border-discord-hover/50">
                    <Avatar user={u} size={40} onClick={() => { setShowFollowRequests(false); navigate(`/profile/${u.username}`); }} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setShowFollowRequests(false); navigate(`/profile/${u.username}`); }}>
                      <p className="text-discord-text font-semibold text-sm truncate">{u.name}</p>
                      <p className="text-discord-muted text-xs">@{u.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="p-1.5 rounded-full bg-discord-brand/10 border border-discord-brand/30 text-discord-brand hover:bg-discord-brand hover:text-white transition-colors"
                        title="Accept"
                        onClick={async () => {
                          try {
                            await API.acceptFollowRequest(u.username);
                            setFollowRequests(prev => prev.filter(r => (r.user || r).username !== u.username));
                            setUser(u2 => ({ ...u2, followers: [...(u2.followers || []), u._id || u.username] }));
                          } catch { showToast('Failed to accept', { type: 'error' }); }
                        }}
                      >
                        <FiCheck size={15} />
                      </button>
                      <button
                        className="p-1.5 rounded-full bg-discord-red/10 border border-discord-red/30 text-discord-red hover:bg-discord-red hover:text-white transition-colors"
                        title="Decline"
                        onClick={async () => {
                          try {
                            await API.declineFollowRequest(u.username);
                            setFollowRequests(prev => prev.filter(r => (r.user || r).username !== u.username));
                          } catch { showToast('Failed to decline', { type: 'error' }); }
                        }}
                      >
                        <FiX size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
