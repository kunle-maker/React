import React, { useState } from 'react';
import { FiImage, FiX, FiSend, FiAtSign, FiVideo, FiArrowLeft, FiSmile } from 'react-icons/fi';
import { MdAspectRatio } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import ImageCropModal from '../components/ImageCropModal';
import EmojiPicker from '../components/EmojiPicker';
import SoundPicker from '../components/SoundPicker';
import { FiImage, FiX, FiSend, FiAtSign, FiVideo, FiArrowLeft, FiSmile, FiMusic } from 'react-icons/fi';

const RATIO_OPTIONS = [
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '1:1', value: '1:1' },
  { label: '4:5', value: '4:5' },
];

function ratioToStyle(ratio) {
  const map = {
    '9:16': { aspectRatio: '9/16', maxHeight: 220 },
    '16:9': { aspectRatio: '16/9', maxHeight: 180 },
    '1:1':  { aspectRatio: '1/1',  maxHeight: 200 },
    '4:5':  { aspectRatio: '4/5',  maxHeight: 210 },
  };
  return map[ratio] || map['9:16'];
}

export default function CreatePostPage({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [videoRatios, setVideoRatios] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const textRef = React.useRef();
  const fileRef = React.useRef();

  const insertEmoji = (emoji) => {
    const ta = textRef.current;
    if (!ta) { setCaption(c => c + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setCaption(prev => prev.slice(0, start) + emoji + prev.slice(end));
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + emoji.length; ta.focus(); }, 0);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5 - files.length);
    if (!selected.length) return;
    const file = selected[0];
    if (file.type.startsWith('image/')) {
      setCropSrc(URL.createObjectURL(file));
      setPendingFile({ file, remaining: selected.slice(1) });
    } else {
      addFiles(selected);
    }
    e.target.value = '';
  };

  const addFiles = (newFiles) => {
    const newPreviews = newFiles.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
      name: f.name,
    }));
    setFiles(prev => {
      const updated = [...prev, ...newFiles].slice(0, 5);
      newFiles.forEach((f, i) => {
        if (f.type.startsWith('video')) {
          setVideoRatios(r => ({ ...r, [prev.length + i]: '9:16' }));
        }
      });
      return updated;
    });
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5));
  };

  const handleCropDone = (croppedFile, croppedUrl) => {
    setFiles(prev => [...prev, croppedFile].slice(0, 5));
    setPreviews(prev => [...prev, { url: croppedUrl, type: 'image', name: 'cropped.jpg' }].slice(0, 5));
    if (pendingFile?.remaining?.length > 0) {
      const next = pendingFile.remaining[0];
      if (next.type.startsWith('image/')) {
        setCropSrc(URL.createObjectURL(next));
        setPendingFile({ file: next, remaining: pendingFile.remaining.slice(1) });
      } else {
        addFiles(pendingFile.remaining);
        setCropSrc(null);
        setPendingFile(null);
      }
    } else {
      setCropSrc(null);
      setPendingFile(null);
    }
  };

  const handleCropCancel = () => {
    if (pendingFile?.remaining?.length > 0) addFiles(pendingFile.remaining);
    setCropSrc(null);
    setPendingFile(null);
  };

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setVideoRatios(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < i) next[ki] = v;
        else if (ki > i) next[ki - 1] = v;
      });
      return next;
    });
  };

  const handleCaptionChange = async (e) => {
    const val = e.target.value;
    setCaption(val);
    const lastWord = val.split(/\s/).pop();
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const q = lastWord.slice(1);
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

  const handleSubmit = async () => {
    if (!files.length) { setError('Please add at least one image or video'); return; }
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
      await API.createPost(fd);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="flex flex-col items-center justify-center h-full text-center gap-3">
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
            <FiSend size={24} className="text-green-400" />
          </div>
          <p className="text-discord-text font-semibold text-lg">Posted!</p>
          <p className="text-discord-muted text-sm">Redirecting to your feed...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex flex-col h-full max-w-2xl mx-auto">

        {/* Sticky header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-discord-hover bg-discord-bg/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-colors"
            >
              <FiArrowLeft size={18} />
            </button>
            <h1 className="text-base font-bold text-discord-text">New Post</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !files.length}
            className="discord-btn flex items-center gap-2 text-sm px-5 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSend size={14} />
            )}
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Avatar user={currentUser} size={42} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-discord-text text-sm font-semibold mb-1">{currentUser?.name}</p>

              {/* Caption */}
              <div className="relative">
                <textarea
                  ref={textRef}
                  value={caption}
                  onChange={handleCaptionChange}
                  placeholder="What's on your mind? Use @username to mention someone..."
                  rows={3}
                  className="w-full bg-transparent text-discord-text placeholder-discord-muted text-sm resize-none outline-none leading-relaxed"
                />
                {showMentionSuggestions && mentionResults.length > 0 && (
                  <div className="absolute top-full left-0 bg-discord-dark border border-discord-hover rounded-xl shadow-xl z-20 min-w-48 max-h-40 overflow-y-auto">
                    {mentionResults.slice(0, 5).map(u => (
                      <button
                        key={u._id || u.username}
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-discord-hover text-left transition-colors"
                        onClick={() => insertMention(u.username)}
                      >
                        <Avatar user={u} size={24} />
                        <span className="text-discord-text text-sm font-medium">{u.name}</span>
                        <span className="text-discord-muted text-xs">@{u.username}</span>
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

              {/* Media previews */}
              {previews.length > 0 && (
                <div className="mt-3 space-y-3">
                  {previews.map((p, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-discord-dark">
                      {p.type === 'video' ? (
                        <div>
                          <div
                            className="relative mx-auto overflow-hidden bg-black"
                            style={{
                              ...ratioToStyle(videoRatios[i] || '9:16'),
                              width: '100%',
                              maxWidth: (() => {
                                const r = videoRatios[i] || '9:16';
                                const h = ratioToStyle(r).maxHeight;
                                if (r === '16:9') return h * 16 / 9;
                                if (r === '1:1') return h;
                                if (r === '4:5') return h * 4 / 5;
                                return h * 9 / 16;
                              })(),
                            }}
                          >
                            <video src={p.url} className="w-full h-full object-cover" playsInline muted />
                            <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <FiVideo size={10} className="text-white" />
                              <span className="text-white text-[10px] font-medium">Video</span>
                            </div>
                            <button
                              type="button"
                              className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 text-white hover:bg-black transition-colors"
                              onClick={() => removeFile(i)}
                            >
                              <FiX size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 px-2 py-2">
                            <MdAspectRatio size={13} className="text-discord-muted flex-shrink-0" />
                            <span className="text-discord-muted text-xs">Ratio:</span>
                            <div className="flex gap-1.5">
                              {RATIO_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                                    (videoRatios[i] || '9:16') === opt.value
                                      ? 'bg-discord-brand border-discord-brand text-white'
                                      : 'border-discord-hover text-discord-muted hover:border-discord-brand hover:text-discord-brand'
                                  }`}
                                  onClick={() => setVideoRatios(r => ({ ...r, [i]: opt.value }))}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={p.url} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 text-white hover:bg-black transition-colors"
                            onClick={() => removeFile(i)}
                          >
                            <FiX size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {files.length < 5 && (
                    <button
                      type="button"
                      className="w-full py-3 rounded-xl border border-dashed border-discord-hover flex items-center justify-center gap-2 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-colors text-sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <FiImage size={15} />
                      <span>Add more media</span>
                    </button>
                  )}
                </div>
              )}

              {/* Empty state upload zone */}
              {previews.length === 0 && (
                <button
                  type="button"
                  className="mt-2 w-full py-12 rounded-2xl border-2 border-dashed border-discord-hover flex flex-col items-center justify-center gap-3 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  <FiImage size={28} />
                  <div className="text-center">
                    <p className="font-medium text-sm">Add photos or videos</p>
                    <p className="text-xs mt-0.5 opacity-70">Up to 5 files</p>
                  </div>
                </button>
              )}

              <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            </div>
          </div>
        </div>

        {/* Bottom toolbar - not fixed, lives in the flex column */}
        <div className="flex-shrink-0 border-t border-discord-hover bg-discord-bg/95 backdrop-blur px-4 pt-2 pb-20 md:pb-3 flex items-center gap-1 relative">
          <button
            type="button"
            className="p-2.5 rounded-full text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors disabled:opacity-40"
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= 5}
            title="Add media"
          >
            <FiImage size={20} />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-full text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
            onClick={() => { setCaption(c => c + '@'); textRef.current?.focus(); }}
            title="Mention someone"
          >
            <FiAtSign size={20} />
          </button>
          <button
            type="button"
            className={`p-2.5 rounded-full hover:bg-discord-brand/10 transition-colors ${showEmojiPicker ? 'text-discord-brand' : 'text-discord-muted hover:text-discord-brand'}`}
            onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
            title="Emoji"
          >
            <FiSmile size={20} />
          </button>
          <button
            type="button"
            className={`p-2.5 rounded-full transition-all active:scale-90 ${selectedSound ? 'text-green-400 bg-green-400/10' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
            onClick={() => setShowSoundPicker(true)}
            title="Add Music"
          >
            <FiMusic size={20} />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2">
              <EmojiPicker
                onSelect={emoji => { insertEmoji(emoji); setShowEmojiPicker(false); }}
                onClose={() => setShowEmojiPicker(false)}
                anchor="top"
              />
            </div>
          )}
          {files.length > 0 && (
            <span className="text-discord-muted text-xs ml-1">{files.length}/5 file{files.length !== 1 ? 's' : ''}</span>
          )}
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
    </Layout>
  );
}
