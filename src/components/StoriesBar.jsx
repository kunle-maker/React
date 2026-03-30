import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';

export default function StoriesBar({ currentUser, onOpenViewer }) {
  const [groups, setGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
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
    const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4'];
    const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
    return (
      <div className={`p-[2.5px] rounded-full ${unviewed ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500' : 'bg-discord-muted/30'}`}>
        <div className="bg-discord-bg p-[2px] rounded-full">
          {src ? (
            <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
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
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-discord-hover">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-discord-hover" />
            <div className="h-2 w-10 rounded bg-discord-hover" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

      {preview && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm h-full max-h-[80vh] bg-black">
            <img src={preview} alt="preview" className="w-full h-full object-contain" />
          </div>
          <div className="w-full max-w-sm px-4 py-3 bg-discord-dark">
            <input
              className="w-full bg-discord-hover rounded-xl px-3 py-2 text-discord-text text-sm outline-none placeholder-discord-muted mb-3"
              placeholder="Add a caption..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={cancelPreview} className="flex-1 py-2 rounded-xl bg-discord-hover text-discord-text text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handlePost} disabled={creating} className="flex-1 py-2 rounded-xl bg-discord-brand text-white text-sm font-semibold disabled:opacity-60">
                {creating ? 'Posting…' : 'Share Story'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-discord-hover">
        <div
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          onClick={() => {
            if (hasMyStory) {
              onOpenViewer([{ user: currentUser, stories: myStories, hasUnviewed: false }], 0);
            } else {
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="relative">
            <AvatarRing
              src={currentUser?.profilePicture ? API.getAvatarUrl(currentUser.profilePicture, 112) : null}
              name={currentUser?.name || currentUser?.username}
              unviewed={hasMyStory}
            />
            {!hasMyStory && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-discord-brand flex items-center justify-center border-2 border-discord-bg">
                <span className="text-white text-xs font-bold leading-none">+</span>
              </div>
            )}
          </div>
          <span className="text-[10px] text-discord-muted truncate w-14 text-center">
            {hasMyStory ? 'Your story' : 'Add story'}
          </span>
        </div>

        {groups.map((group, idx) => {
          const { user, hasUnviewed } = group;
          return (
            <div
              key={user?._id || idx}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
              onClick={() => onOpenViewer(groups, idx)}
            >
              <AvatarRing
                src={user?.profilePicture ? API.getAvatarUrl(user.profilePicture, 112) : null}
                name={user?.name || user?.username}
                unviewed={hasUnviewed}
              />
              <span className="text-[10px] text-discord-muted truncate w-14 text-center">
                {user?.username || user?.name}
              </span>
            </div>
          );
        })}

        {groups.length === 0 && !hasMyStory && (
          <div className="text-discord-muted text-xs flex items-center py-2 pl-1">
            No stories yet — tap + to add yours
          </div>
        )}
      </div>
    </>
  );
}
