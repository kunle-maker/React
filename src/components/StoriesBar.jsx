import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { FiX } from 'react-icons/fi';
import API from '../utils/api';

const StoriesBar = forwardRef(function StoriesBar({ currentUser, onOpenViewer }, ref) {
  const [groups, setGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState('image');
  const [pendingFile, setPendingFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    try {
      const [feedData, myData] = await Promise.all([
        API.getStoriesFeed(),
        API.getMyStories(),
      ]);
      setGroups(Array.isArray(feedData) ? feedData : feedData?.stories || []);
      setMyStories(Array.isArray(myData) ? myData : myData?.stories || []);
    } catch {}
    finally { setLoading(false); }
  };

  useImperativeHandle(ref, () => ({
    reload: loadStories,
  }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    setPreviewType(file.type.startsWith('video') ? 'video' : 'image');
    e.target.value = '';
  };

  const handlePost = async () => {
    if (!pendingFile || creating) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('media', pendingFile);
      if (caption.trim()) fd.append('caption', caption.trim());
      await API.createStory(fd);
      setPreview(null);
      setPendingFile(null);
      setCaption('');
      await loadStories();
    } catch {}
    finally { setCreating(false); }
  };

  const cancelPreview = () => {
    setPreview(null);
    setPendingFile(null);
    setCaption('');
  };

  const hasMyStory = myStories.length > 0;

  const AvatarRing = ({ src, name, unviewed, size = 56 }) => {
    const colors = ['#8b5cf6', '#10b981', '#faa61a', '#ed4245', '#3ba55c', '#00b0f4'];
    const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
    return (
      <div className={`p-[2.5px] rounded-full transition-all duration-500 ${unviewed ? 'bg-gradient-to-br from-brand-primary via-brand-accent to-blue-500 animate-pulse' : 'bg-discord-muted/20'}`}>
        <div className="bg-discord-bg p-[2px] rounded-full">
          {src ? (
            <img src={src} alt={`${name}'s story`} className="rounded-full object-cover" style={{ width: size, height: size }} />
          ) : (
            <div className="rounded-full flex items-center justify-center text-white font-bold" style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.4 }}>
              {(name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 rounded-2xl animate-pulse bg-discord-hover/40" style={{ width: 72, height: 104 }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

      {preview && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fade-in">
          <div className="relative w-full max-w-sm flex-1 flex items-center justify-center bg-black/40 rounded-3xl overflow-hidden my-4 shadow-2xl border border-white/10">
            {previewType === 'video' ? (
              <video src={preview} className="w-full h-full object-contain" autoPlay muted playsInline loop />
            ) : (
              <img src={preview} alt="story preview" className="w-full h-full object-contain" />
            )}
            <button 
              onClick={cancelPreview}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="w-full max-w-sm px-6 py-6 bg-discord-dark/90 backdrop-blur-xl border-t border-white/10 rounded-t-[32px] shadow-2xl animate-slide-up">
            <input
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-discord-text text-sm outline-none placeholder-discord-muted mb-4 focus:border-brand-primary/50 transition-all"
              placeholder="Add a caption..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={cancelPreview} className="flex-1 py-3 rounded-2xl bg-white/5 text-discord-text text-sm font-bold hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handlePost} disabled={creating} className="flex-1 py-3 rounded-2xl bg-brand-primary text-white text-sm font-bold disabled:opacity-60 shadow-brand hover:scale-[1.02] active:scale-95 transition-all">
                {creating ? 'Posting…' : 'Share Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
        {/* Your Story card */}
        <div
          className="flex flex-col items-end justify-end flex-shrink-0 cursor-pointer group relative overflow-hidden rounded-2xl"
          style={{ width: 72, height: 104 }}
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(8);
            if (hasMyStory) {
              onOpenViewer([{ user: currentUser, stories: myStories, hasUnviewed: false }], 0);
            } else {
              fileInputRef.current?.click();
            }
          }}
          aria-label={hasMyStory ? 'View your story' : 'Add to your story'}
        >
          {/* Background — profile pic or gradient */}
          {currentUser?.profilePicture ? (
            <img
              src={API.getAvatarUrl(currentUser.profilePicture, 200)}
              alt="Your story"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/60 to-purple-700/60" />
          )}
          {/* Dark gradient overlay at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {/* + add button */}
          {!hasMyStory && (
            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center border-2 border-discord-bg shadow-lg">
              <span className="text-white text-xs font-black leading-none">+</span>
            </div>
          )}
          {hasMyStory && (
            <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-primary ring-offset-1 ring-offset-transparent" />
          )}
          {/* Label */}
          <span className="relative z-10 text-[10px] font-bold text-white/90 px-1.5 pb-2 leading-tight text-center w-full text-center">
            Your Story
          </span>
        </div>

        {/* Other stories */}
        {groups.filter(group => {
          const myId = currentUser?._id || currentUser?.id;
          return group.user?._id !== myId && group.user?.username !== currentUser?.username;
        }).map((group, idx) => {
          const { user, hasUnviewed } = group;
          const src = user?.profilePicture ? API.getAvatarUrl(user.profilePicture, 200) : null;
          return (
            <div
              key={user?._id || idx}
              className="flex flex-col items-end justify-end flex-shrink-0 cursor-pointer group relative overflow-hidden rounded-2xl"
              style={{ width: 72, height: 104 }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                onOpenViewer(groups, idx);
              }}
              aria-label={`View ${user?.username}'s story`}
            >
              {/* Background */}
              {src ? (
                <img src={src} alt={user?.username} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, hsl(${(user?.username?.charCodeAt(0) || 0) * 7 % 360}deg 60% 35%), hsl(${(user?.username?.charCodeAt(0) || 0) * 11 % 360}deg 50% 25%))` }} />
              )}
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              {/* Unviewed ring */}
              {hasUnviewed && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-primary ring-offset-1 ring-offset-black/50" />
              )}
              {/* Small avatar at bottom-left */}
              <div className="absolute bottom-8 left-1.5">
                {src ? (
                  <img src={src} alt={user?.username} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: `hsl(${(user?.username?.charCodeAt(0) || 0) * 7 % 360}deg 60% 40%)` }}>
                    {(user?.name || user?.username || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              {/* Username label */}
              <span className="relative z-10 text-[10px] font-bold text-white/90 px-1.5 pb-2 leading-tight truncate w-full text-center">
                {user?.username || user?.name}
              </span>
            </div>
          );
        })}

        {groups.length === 0 && !hasMyStory && (
          <div className="text-discord-muted text-xs flex items-center py-2 pl-2 font-medium opacity-60">
            No stories yet
          </div>
        )}
      </div>
    </>
  );
});

export default StoriesBar;
