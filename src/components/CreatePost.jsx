import React, { useState, useRef } from 'react';
import { FiImage, FiX, FiSend, FiAtSign } from 'react-icons/fi';
import Avatar from './Avatar';
import API from '../utils/api';
import ImageCropModal from './ImageCropModal';

export default function CreatePost({ currentUser, onPost }) {
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileRef = useRef();
  const textRef = useRef();

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
      files.forEach(f => fd.append('media', f));
      const data = await API.createPost(fd);
      setCaption('');
      setFiles([]);
      setPreviews([]);
      onPost?.(data.post || data);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  return (
    <div className="px-4 py-3 border-b border-discord-hover">
      <div className="flex gap-3">
        <Avatar user={currentUser} size={44} />
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={textRef}
                value={caption}
                onChange={handleCaptionChange}
                placeholder="What's happening? (use @username to mention)"
                rows={caption.length > 100 ? 4 : 2}
                className="w-full bg-transparent text-discord-text placeholder-discord-muted text-sm resize-none outline-none border-b border-discord-hover pb-2 focus:border-discord-brand transition-colors"
              />
              {showMentionSuggestions && mentionResults.length > 0 && (
                <div className="absolute top-full left-0 bg-discord-dark border border-discord-hover rounded-lg shadow-xl z-20 min-w-48 max-h-40 overflow-y-auto">
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

            {previews.length > 0 && (
              <div className={`grid gap-2 mt-2 ${previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {previews.map((p, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-discord-dark">
                    {p.type === 'video' ? (
                      <video src={p.url} className="w-full h-28 object-cover" />
                    ) : (
                      <img src={p.url} alt="" className="w-full h-28 object-cover" />
                    )}
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-discord-dark/80 rounded-full p-0.5 text-white hover:bg-discord-dark transition-colors"
                      onClick={() => removeFile(i)}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-discord-red text-xs mt-1">{error}</p>}

            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-2 rounded-full text-discord-brand hover:bg-discord-brand/10 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  disabled={files.length >= 5}
                >
                  <FiImage size={18} />
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                <button
                  type="button"
                  className="p-2 rounded-full text-discord-brand hover:bg-discord-brand/10 transition-colors"
                  onClick={() => { setCaption(c => c + '@'); textRef.current?.focus(); }}
                >
                  <FiAtSign size={18} />
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || files.length === 0}
                className="discord-btn flex items-center gap-2 text-sm px-4 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiSend size={14} />
                )}
                Post
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
    </div>
  );
}
