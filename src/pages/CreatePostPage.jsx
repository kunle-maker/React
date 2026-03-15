import React, { useState } from 'react';
import { FiImage, FiX, FiSend, FiAtSign, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import ImageCropModal from '../components/ImageCropModal';

export default function CreatePostPage({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionResults, setMentionResults] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);
  const [cropIndex, setCropIndex] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const textRef = React.useRef();
  const fileRef = React.useRef();

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5 - files.length);
    if (selected.length === 0) return;
    const file = selected[0];
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setCropSrc(url);
      setCropIndex(files.length);
      setPendingFile({ file, remaining: selected.slice(1) });
    } else {
      addFiles(selected);
    }
    e.target.value = '';
  };

  const addFiles = (newFiles) => {
    const previews_ = newFiles.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
      name: f.name
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    setPreviews(prev => [...prev, ...previews_].slice(0, 5));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) { setError('Please add at least one image or video'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (caption) fd.append('caption', caption);
      files.forEach(f => fd.append('media', f));
      await API.createPost(fd);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3">
          <h1 className="text-xl font-bold text-discord-text">Create Post</h1>
        </div>

        <div className="px-4 py-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Avatar user={currentUser} size={48} />
            </div>
            <div className="flex-1">
              {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                    <FiCheck size={28} className="text-green-400" />
                  </div>
                  <p className="text-discord-text font-semibold text-lg">Posted!</p>
                  <p className="text-discord-muted text-sm mt-1">Redirecting to your feed...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <textarea
                      ref={textRef}
                      value={caption}
                      onChange={handleCaptionChange}
                      placeholder="What's on your mind? (use @username to mention)"
                      rows={4}
                      className="w-full bg-transparent text-discord-text placeholder-discord-muted text-base resize-none outline-none border-b border-discord-hover pb-3 focus:border-discord-brand transition-colors leading-relaxed"
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
                    <div className={`grid gap-2 mt-4 ${previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {previews.map((p, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden bg-discord-dark aspect-square">
                          {p.type === 'video' ? (
                            <video src={p.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={p.url} alt="" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-white hover:bg-black transition-colors"
                            onClick={() => removeFile(i)}
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      ))}
                      {files.length < 5 && (
                        <button
                          type="button"
                          className="aspect-square rounded-xl border-2 border-dashed border-discord-hover flex flex-col items-center justify-center gap-2 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-colors"
                          onClick={() => fileRef.current?.click()}
                        >
                          <FiImage size={24} />
                          <span className="text-xs">Add more</span>
                        </button>
                      )}
                    </div>
                  )}

                  {previews.length === 0 && (
                    <button
                      type="button"
                      className="mt-4 w-full py-12 rounded-2xl border-2 border-dashed border-discord-hover flex flex-col items-center justify-center gap-3 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      <FiImage size={36} />
                      <div className="text-center">
                        <p className="font-medium">Add photos or videos</p>
                        <p className="text-xs mt-1">Up to 5 files</p>
                      </div>
                    </button>
                  )}

                  <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

                  {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

                  <div className="flex items-center justify-between mt-5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="p-2 rounded-full text-discord-brand hover:bg-discord-brand/10 transition-colors"
                        onClick={() => fileRef.current?.click()}
                        disabled={files.length >= 5}
                        title="Add media"
                      >
                        <FiImage size={20} />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-full text-discord-brand hover:bg-discord-brand/10 transition-colors"
                        onClick={() => { setCaption(c => c + '@'); textRef.current?.focus(); }}
                        title="Mention someone"
                      >
                        <FiAtSign size={20} />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || files.length === 0}
                      className="discord-btn flex items-center gap-2 text-sm px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiSend size={15} />
                      )}
                      {loading ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
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
    </Layout>
  );
}
