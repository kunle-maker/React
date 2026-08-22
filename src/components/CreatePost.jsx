import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiImage, FiX, FiSend, FiAtSign, FiMusic } from 'react-icons/fi';
import Avatar from './Avatar';
import API from '../utils/api';
import ImageCropModal from './ImageCropModal';
import SoundPicker from './SoundPicker';
import TwemojiTextarea from './TwemojiTextarea';

const DRAFT_KEY = 'vx_draft_post_caption';

export default function CreatePost({ currentUser, onPost }) {
  const [caption, setCaption] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const fileRef = useRef();
  const textRef = useRef();
  const draftTimer = useRef(null);

  const saveDraft = useCallback((val) => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (val.trim()) localStorage.setItem(DRAFT_KEY, val);
      else localStorage.removeItem(DRAFT_KEY);
    }, 600);
  }, []);

  useEffect(() => () => clearTimeout(draftTimer.current), []);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5 - files.length);
    if (selected.length === 0) return;
    const imageFiles = selected.filter(f => f.type.startsWith('image/'));
    const otherFiles = selected.filter(f => !f.type.startsWith('image/'));

    if (otherFiles.length > 0) {
      addRawFiles(otherFiles);
    }

    if (imageFiles.length > 0) {
      const firstImg = imageFiles[0];
      setCropSrc(URL.createObjectURL(firstImg));
      setPendingFiles(imageFiles.slice(1));
    }

    e.target.value = '';
  };

  const addRawFiles = (newFiles) => {
    const newPreviews = newFiles.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
      name: f.name
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const handleCropDone = (croppedFile, croppedUrl) => {
    setFiles(prev => [...prev, croppedFile].slice(0, 5));
    setPreviews(prev => [...prev, { url: croppedUrl, type: 'image', name: 'cropped.jpg' }].slice(0, 5));

    if (pendingFiles.length > 0) {
      const next = pendingFiles[0];
      setCropSrc(URL.createObjectURL(next));
      setPendingFiles(prev => prev.slice(1));
    } else {
      setCropSrc(null);
    }
  };

  const handleCropCancel = () => {
    if (pendingFiles.length > 0) {
      const next = pendingFiles[0];
      setCropSrc(URL.createObjectURL(next));
      setPendingFiles(prev => prev.slice(1));
    } else {
      setCropSrc(null);
    }
  };

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleCaptionChange = async (e) => {
    const val = e.target.value;
    setCaption(val);
    saveDraft(val);
    const lastWord = val.split(/\s/).pop();
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const q = lastWord.slice(1);
      setMentionQuery(q);
      setShowMentionSuggestions(true);
      try {
        const res = await API.searchUsers(q);
        setMentionResults(res.users || res || []);
      } catch { setMentionResults([]); }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const insertMention = (username) => {
    const words = caption.split(/(\s)/);
    words[words.length - 1] = `@${username} `;
    setCaption(words.join(''));
    setShowMentionSuggestions(false);
    textRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) { setError('Please add at least one image or video'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (caption) fd.append('caption', caption);
      if (selectedSound) {
        fd.append('soundUrl', selectedSound.url);
        fd.append('soundName', selectedSound.name);
        fd.append('soundArtist', selectedSound.artist);
      }
      files.forEach(f => fd.append('media', f));
      const data = await API.createPost(fd);
      setCaption('');
      setFiles([]);
      setPreviews([]);
      setSelectedSound(null);
      localStorage.removeItem(DRAFT_KEY);
      onPost?.(data.post || data);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  return (
    <div className="px-4 py-4 border-b border-discord-hover/30 bg-discord-bg/20">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Avatar user={currentUser} size={48} />
        </div>
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative group">
              <TwemojiTextarea
                ref={textRef}
                value={caption}
                aria-label="Post caption"
                onChange={handleCaptionChange}
                placeholder="What's happening? (use @username to mention)"
                rows={caption.length > 100 ? 5 : 3}
                wrapperClassName="w-full"
                className="w-full bg-transparent text-discord-text text-[15px] resize-none outline-none border-b border-discord-hover/50 pb-3 focus:border-brand-primary transition-all leading-relaxed"
              />
              {showMentionSuggestions && mentionResults.length > 0 && (
                <div className="absolute top-full left-0 bg-discord-dark border border-discord-hover/50 rounded-2xl shadow-2xl z-20 min-w-[240px] max-h-56 overflow-y-auto glass-card animate-slide-up py-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-discord-muted uppercase tracking-wider border-b border-discord-hover/30 mb-1">
                    Suggestions
                  </div>
                  {mentionResults.slice(0, 8).map(u => (
                    <button
                      key={u._id || u.username}
                      type="button"
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-brand-primary/10 hover:text-brand-primary text-left transition-colors group/item"
                      onClick={() => insertMention(u.username)}
                    >
                      <Avatar user={u} size={28} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-discord-text text-sm font-bold truncate group-hover/item:text-brand-primary">{u.name}</span>
                        <span className="text-discord-muted text-xs truncate">@{u.username}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSound && (
              <div className="mt-3 flex items-center gap-3 bg-discord-dark/50 p-2 rounded-xl border border-brand-primary/20 animate-fade-in">
                <img src={selectedSound.artwork} alt="" className="w-10 h-10 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-discord-text truncate">{selectedSound.name}</p>
                  <p className="text-[10px] text-discord-muted truncate">{selectedSound.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSound(null)}
                  className="p-1.5 text-discord-muted hover:text-discord-red"
                >
                  <FiX size={14} />
                </button>
              </div>
            )}

            {previews.length > 0 && (
              <div className={`grid gap-2.5 mt-4 ${previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {previews.map((p, i) => (
                  <div key={i} className="relative rounded-2xl overflow-hidden bg-discord-dark border border-discord-hover/30 group/img shadow-lg">
                    {p.type === 'video' ? (
                      <video src={p.url} className="w-full h-32 object-cover" />
                    ) : (
                      <img src={p.url} alt={`Preview ${i}`} className="w-full h-32 object-cover transition-transform duration-500 group-hover/img:scale-110" />
                    )}
                    <button
                      type="button"
                      aria-label="Remove file"
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-full p-1.5 text-white hover:bg-discord-red transition-all scale-90 group-hover/img:scale-100"
                      onClick={() => removeFile(i)}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-discord-red text-[11px] mt-2 font-medium bg-discord-red/10 px-3 py-1.5 rounded-lg border border-discord-red/20 animate-fade-in">{error}</p>}

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Add images or video"
                  className="p-2.5 rounded-full text-brand-primary hover:bg-brand-primary/10 transition-all active:scale-90"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8);
                    fileRef.current?.click();
                  }}
                  disabled={files.length >= 5}
                >
                  <FiImage size={22} />
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                
                <button
                  type="button"
                  aria-label="Add music"
                  className={`p-2.5 rounded-full transition-all active:scale-90 ${selectedSound ? 'text-green-400 bg-green-400/10' : 'text-brand-primary hover:bg-brand-primary/10'}`}
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8);
                    setShowSoundPicker(true);
                  }}
                >
                  <FiMusic size={22} />
                </button>

                <button
                  type="button"
                  aria-label="Add mention"
                  className="p-2.5 rounded-full text-brand-primary hover:bg-brand-primary/10 transition-all active:scale-90"
                  onClick={() => { 
                    if (navigator.vibrate) navigator.vibrate(8);
                    setCaption(c => c + '@'); 
                    textRef.current?.focus(); 
                  }}
                >
                  <FiAtSign size={22} />
                </button>
              </div>
              <button
                type="submit"
                aria-label="Post now"
                disabled={loading || files.length === 0}
                className="discord-btn flex items-center gap-2 text-sm px-6 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-brand hover:shadow-brand-lg active:scale-95 transition-all"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSend size={16} />
                )}
                <span className="font-bold">Post</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspectRatio={1}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      {showSoundPicker && (
        <SoundPicker
          onSelect={(sound) => {
            setSelectedSound(sound);
            setShowSoundPicker(false);
          }}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
    </div>
  );
}
