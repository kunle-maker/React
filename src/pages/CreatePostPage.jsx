import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiImage, FiX, FiSend, FiAtSign, FiVideo, FiArrowLeft, FiSmile, FiMusic, FiEdit2, FiPlus, FiVolumeX, FiVolume2, FiBarChart2, FiZap, FiClock, FiTrash2, FiUpload } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import EmojiPicker from '../components/EmojiPicker';
import SoundPicker from '../components/SoundPicker';
import MediaEditor from '../components/MediaEditor';
import { showToast } from '../utils/toast';
import { formatDistanceToNow } from 'date-fns';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [mutedVideoIndices, setMutedVideoIndices] = useState(new Set());

  // Supa-only toggle
  const [isSupaOnly, setIsSupaOnly] = useState(false);

  // Poll state
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollExpiresHours, setPollExpiresHours] = useState(24);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // AI Captions state
  const [showAICaptions, setShowAICaptions] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('casual');
  const [aiCaptions, setAiCaptions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Drafts state
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const textRef = useRef();
  const fileRef = useRef();

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
    const toAdd = selected.map(f => ({
      file: f,
      type: f.type.startsWith('video') ? 'video' : 'image',
      url: URL.createObjectURL(f),
    }));
    const newFiles = [...files];
    const newPreviews = [...previews];
    toAdd.forEach(item => {
      newFiles.push(item.file);
      newPreviews.push({ url: item.url, type: item.type });
    });
    setFiles(newFiles.slice(0, 5));
    setPreviews(newPreviews.slice(0, 5));
    if (newFiles.length > 0) {
      const firstNew = files.length;
      setEditingIndex(firstNew);
    }
    e.target.value = '';
  };

  const handleEditorDone = (editedFile, editedUrl, meta = {}) => {
    setFiles(prev => prev.map((f, i) => i === editingIndex ? editedFile : f));
    setPreviews(prev => prev.map((p, i) => i === editingIndex ? { ...p, url: editedUrl } : p));
    if (meta.videoMuted !== undefined) {
      setMutedVideoIndices(prev => {
        const next = new Set(prev);
        if (meta.videoMuted) next.add(editingIndex);
        else next.delete(editingIndex);
        return next;
      });
    }
    setEditingIndex(null);
  };

  const handleEditorCancel = () => {
    if (previews[editingIndex] && files[editingIndex]) {
      setEditingIndex(null);
    } else {
      removeFile(editingIndex);
      setEditingIndex(null);
    }
  };

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
    setMutedVideoIndices(prev => {
      const next = new Set();
      prev.forEach(idx => { if (idx !== i) next.add(idx > i ? idx - 1 : idx); });
      return next;
    });
  };

  const toggleMuteVideo = (i) => {
    setMutedVideoIndices(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
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
    if (!files.length && !showPollBuilder) { setError('Please add at least one image or video'); return; }
    if (showPollBuilder && !pollQuestion.trim()) { setError('Enter a poll question'); return; }
    if (showPollBuilder && pollOptions.filter(o => o.trim()).length < 2) { setError('Add at least 2 poll options'); return; }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (caption) fd.append('caption', caption);
      if (isSupaOnly) fd.append('isSupaOnly', 'true');
      if (selectedSound) {
        if (selectedSound.id) fd.append('soundId', selectedSound.id);
        if (selectedSound.url) fd.append('soundUrl', selectedSound.url);
        if (selectedSound.name) fd.append('soundName', selectedSound.name);
        if (selectedSound.artist) fd.append('soundArtist', selectedSound.artist);
      }
      const hasVideos = previews.some(p => p.type === 'video');
      if (selectedSound && hasVideos) fd.append('muteVideo', 'true');
      else if (mutedVideoIndices.size > 0) fd.append('muteVideo', 'true');
      files.forEach(f => fd.append('media', f));

      // Attach poll if built
      if (showPollBuilder && pollQuestion.trim()) {
        const validOptions = pollOptions.filter(o => o.trim());
        const pollPayload = {
          question: pollQuestion.trim(),
          options: validOptions,
          allowMultiple: pollAllowMultiple,
          expiresAt: new Date(Date.now() + pollExpiresHours * 3600 * 1000).toISOString(),
        };
        fd.append('poll', JSON.stringify(pollPayload));
      }

      await API.createPost(fd);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const fd = new FormData();
      fd.append('status', 'draft');
      if (caption) fd.append('caption', caption);
      files.forEach(f => fd.append('media', f));
      await API.saveDraft(fd);
      showToast('Draft saved!', { type: 'success' });
    } catch (err) {
      showToast(err.message || 'Failed to save draft', { type: 'error' });
    } finally { setSavingDraft(false); }
  };

  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const data = await API.getDrafts();
      setDrafts(Array.isArray(data) ? data : data?.drafts || []);
    } catch { setDrafts([]); }
    finally { setDraftsLoading(false); }
  };

  const handlePublishDraft = async (draftId) => {
    try {
      await API.publishDraft(draftId);
      showToast('Draft published!', { type: 'success' });
      setDrafts(prev => prev.filter(d => d._id !== draftId));
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      showToast(err.message || 'Failed to publish draft', { type: 'error' });
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await API.deleteDraft(draftId);
      setDrafts(prev => prev.filter(d => d._id !== draftId));
      showToast('Draft deleted', { type: 'success' });
    } catch (err) {
      showToast(err.message || 'Failed to delete draft', { type: 'error' });
    }
  };

  const handleGenerateCaptions = async () => {
    if (!aiTopic.trim() && files.length === 0) {
      showToast('Enter a topic or add media first', { type: 'error' });
      return;
    }
    setAiLoading(true);
    setAiCaptions([]);
    try {
      const data = await API.generateCaptions({
        topic: aiTopic.trim() || undefined,
        imageDescription: caption.trim() || undefined,
        tone: aiTone,
        count: 3,
      });
      setAiCaptions(data?.captions || data || []);
    } catch (err) {
      showToast(err.message || 'Failed to generate captions', { type: 'error' });
    } finally { setAiLoading(false); }
  };

  if (editingIndex !== null && files[editingIndex]) {
    return (
      <MediaEditor
        file={files[editingIndex]}
        type={previews[editingIndex]?.type || 'image'}
        onDone={handleEditorDone}
        onCancel={handleEditorCancel}
      />
    );
  }

  if (success) {
    return (
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce-once">
            <FiSend size={28} className="text-green-400" />
          </div>
          <p className="text-discord-text font-bold text-xl">Posted!</p>
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft || (!caption && files.length === 0)}
              className="text-discord-muted text-xs font-semibold hover:text-discord-text disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-discord-hover transition-colors"
            >
              {savingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || (!files.length && !showPollBuilder)}
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
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Author + caption */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Avatar user={currentUser} size={42} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-discord-text text-sm font-semibold mb-1">{currentUser?.name}</p>
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
                      <button key={u._id || u.username} type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-discord-hover text-left transition-colors"
                        onClick={() => insertMention(u.username)}>
                        <Avatar user={u} size={24} />
                        <span className="text-discord-text text-sm font-medium">{u.name}</span>
                        <span className="text-discord-muted text-xs">@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sound chip */}
          {selectedSound && (
            <div className="flex items-center gap-3 bg-discord-dark/50 p-2 rounded-xl border border-brand-primary/20 animate-fade-in">
              {selectedSound.artwork && <img src={selectedSound.artwork} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-discord-text truncate">🎵 {selectedSound.name}</p>
                {selectedSound.artist && <p className="text-[10px] text-discord-muted truncate">{selectedSound.artist}</p>}
              </div>
              <button type="button" onClick={() => setSelectedSound(null)} className="p-1.5 text-discord-muted hover:text-discord-red"><FiX size={14} /></button>
            </div>
          )}

          {/* Supa-only chip */}
          {isSupaOnly && (
            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-3 py-2 animate-fade-in">
              <span className="text-yellow-400 text-sm">✦</span>
              <p className="text-yellow-400 text-xs font-semibold flex-1">Supa members only</p>
              <button onClick={() => setIsSupaOnly(false)} className="text-yellow-400/60 hover:text-yellow-400 p-0.5"><FiX size={12} /></button>
            </div>
          )}

          {/* ── AI Captions panel ── */}
          {showAICaptions && (
            <div className="bg-discord-dark/60 border border-discord-brand/25 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiZap size={15} className="text-discord-brand" />
                  <span className="text-sm font-bold text-discord-text">AI Caption Generator</span>
                </div>
                <button onClick={() => { setShowAICaptions(false); setAiCaptions([]); }} className="text-discord-muted hover:text-discord-text p-1"><FiX size={14} /></button>
              </div>
              <div className="flex gap-2">
                <input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="Describe your post or topic…"
                  className="discord-input flex-1 text-sm py-2"
                />
                <select
                  value={aiTone}
                  onChange={e => setAiTone(e.target.value)}
                  className="discord-input text-sm py-2 pr-2 w-32"
                >
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspiring</option>
                </select>
              </div>
              <button
                onClick={handleGenerateCaptions}
                disabled={aiLoading}
                className="discord-btn w-full py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {aiLoading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                  : <><FiZap size={14} /> Generate Captions</>}
              </button>
              {aiCaptions.length > 0 && (
                <div className="space-y-2">
                  {aiCaptions.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setCaption(c); setShowAICaptions(false); setAiCaptions([]); textRef.current?.focus(); }}
                      className="w-full text-left text-sm text-discord-text bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:border-discord-brand/50 hover:bg-discord-brand/8 transition-all"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Poll builder ── */}
          {showPollBuilder && (
            <div className="bg-discord-dark/60 border border-discord-brand/25 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiBarChart2 size={15} className="text-discord-brand" />
                  <span className="text-sm font-bold text-discord-text">Poll</span>
                </div>
                <button onClick={() => setShowPollBuilder(false)} className="text-discord-muted hover:text-discord-text p-1"><FiX size={14} /></button>
              </div>
              <input
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask a question…"
                className="discord-input w-full text-sm"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                      placeholder={`Option ${i + 1}`}
                      className="discord-input flex-1 text-sm"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                        className="p-1.5 text-discord-muted hover:text-discord-red"><FiX size={13} /></button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-discord-brand text-xs font-semibold flex items-center gap-1 hover:underline">
                    <FiPlus size={12} /> Add option
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <FiClock size={13} className="text-discord-muted" />
                  <span className="text-xs text-discord-muted">Duration:</span>
                  <select value={pollExpiresHours} onChange={e => setPollExpiresHours(Number(e.target.value))}
                    className="discord-input text-xs py-1 px-2 w-28">
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={72}>3 days</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pollAllowMultiple} onChange={e => setPollAllowMultiple(e.target.checked)}
                    className="rounded accent-discord-brand" />
                  <span className="text-xs text-discord-muted">Allow multiple choices</span>
                </label>
              </div>
            </div>
          )}

          {/* Media Previews */}
          {previews.length > 0 && (
            <div className="space-y-3">
              {previews.map((p, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden bg-black group">
                  {p.type === 'video'
                    ? <video src={p.url} className="w-full rounded-2xl object-cover" style={{ maxHeight: 300 }} playsInline muted />
                    : <img src={p.url} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 300 }} />}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all rounded-2xl" />
                  <button type="button" className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 text-white hover:bg-black transition-colors z-10" onClick={() => removeFile(i)}>
                    <FiX size={13} />
                  </button>
                  <button type="button" className="absolute bottom-2 right-2 bg-black/70 rounded-full px-3 py-1.5 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black transition-colors z-10 opacity-0 group-hover:opacity-100" onClick={() => setEditingIndex(i)}>
                    <FiEdit2 size={11} /> Edit
                  </button>
                  {p.type === 'video' && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <div className="bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <FiVideo size={10} className="text-white" />
                        <span className="text-white text-[10px] font-medium">Video</span>
                      </div>
                      <button type="button"
                        className={`rounded-full px-2 py-0.5 flex items-center gap-1 text-white text-[10px] font-medium transition-colors ${mutedVideoIndices.has(i) ? 'bg-red-500/80' : 'bg-black/60 hover:bg-black/80'}`}
                        onClick={() => toggleMuteVideo(i)}>
                        {mutedVideoIndices.has(i) ? <FiVolumeX size={10} /> : <FiVolume2 size={10} />}
                        {mutedVideoIndices.has(i) ? 'Muted' : 'Sound'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {files.length < 5 && (
                <button type="button"
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-discord-hover flex items-center justify-center gap-2 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-colors text-sm font-medium"
                  onClick={() => fileRef.current?.click()}>
                  <FiPlus size={16} /> Add more ({files.length}/5)
                </button>
              )}
            </div>
          )}

          {/* Empty upload zone */}
          {previews.length === 0 && !showPollBuilder && (
            <button type="button"
              className="w-full py-14 rounded-2xl border-2 border-dashed border-discord-hover flex flex-col items-center justify-center gap-3 text-discord-muted hover:border-discord-brand hover:text-discord-brand transition-all group"
              onClick={() => fileRef.current?.click()}>
              <div className="flex gap-3">
                <FiImage size={28} className="group-hover:scale-110 transition-transform" />
                <FiVideo size={28} className="group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Add photos or videos</p>
                <p className="text-xs mt-0.5 opacity-60">Up to 5 files — edit after adding</p>
              </div>
            </button>
          )}

          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
        </div>

        {/* Bottom toolbar */}
        <div className="flex-shrink-0 border-t border-discord-hover bg-discord-bg/95 backdrop-blur px-4 pt-2 pb-20 md:pb-3 flex items-center gap-1 relative">
          <button type="button"
            className="p-2.5 rounded-full text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors disabled:opacity-40"
            onClick={() => fileRef.current?.click()} disabled={files.length >= 5} title="Add media">
            <FiImage size={20} />
          </button>
          <button type="button"
            className="p-2.5 rounded-full text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
            onClick={() => { setCaption(c => c + '@'); textRef.current?.focus(); }} title="Mention">
            <FiAtSign size={20} />
          </button>
          <button type="button"
            className={`p-2.5 rounded-full hover:bg-discord-brand/10 transition-colors ${showEmojiPicker ? 'text-discord-brand' : 'text-discord-muted hover:text-discord-brand'}`}
            onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }} title="Emoji">
            <FiSmile size={20} />
          </button>
          <button type="button"
            className={`p-2.5 rounded-full transition-all active:scale-90 ${selectedSound ? 'text-green-400 bg-green-400/10' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
            onClick={() => setShowSoundPicker(true)} title="Add Music">
            <FiMusic size={20} />
          </button>
          {/* Poll toggle */}
          <button type="button"
            className={`p-2.5 rounded-full transition-all active:scale-90 ${showPollBuilder ? 'text-discord-brand bg-discord-brand/10' : 'text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10'}`}
            onClick={() => setShowPollBuilder(p => !p)} title="Add Poll">
            <FiBarChart2 size={20} />
          </button>
          {/* AI Captions toggle */}
          <button type="button"
            className={`p-2.5 rounded-full transition-all active:scale-90 ${showAICaptions ? 'text-yellow-400 bg-yellow-400/10' : 'text-discord-muted hover:text-yellow-400 hover:bg-yellow-400/10'}`}
            onClick={() => setShowAICaptions(p => !p)} title="AI Captions">
            <FiZap size={20} />
          </button>
          {/* Drafts */}
          <button type="button"
            className="p-2.5 rounded-full text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-all active:scale-90"
            onClick={() => { setShowDrafts(true); loadDrafts(); }} title="My Drafts">
            <FiClock size={20} />
          </button>
          {/* Supa-only toggle — only show if user is Supa */}
          {currentUser?.isSupa && (
            <button type="button"
              className={`p-2.5 rounded-full transition-all active:scale-90 ml-auto ${isSupaOnly ? 'text-yellow-400 bg-yellow-400/10' : 'text-discord-muted hover:text-yellow-400 hover:bg-yellow-400/10'}`}
              onClick={() => setIsSupaOnly(p => !p)}
              title={isSupaOnly ? 'Supa-only ON — only Supa members can see this' : 'Make Supa-only'}
            >
              ✦
            </button>
          )}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2">
              <EmojiPicker onSelect={emoji => { insertEmoji(emoji); setShowEmojiPicker(false); }} onClose={() => setShowEmojiPicker(false)} anchor="top" />
            </div>
          )}
          {files.length > 0 && (
            <span className="text-discord-muted text-xs ml-auto font-medium">{files.length}/5 files</span>
          )}
        </div>
      </div>

      {/* ── Drafts modal ── */}
      {showDrafts && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => setShowDrafts(false)}>
          <div className="w-full max-w-lg bg-discord-sidebar rounded-t-3xl flex flex-col" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-discord-hover flex-shrink-0">
              <h3 className="font-bold text-discord-text text-base">My Drafts</h3>
              <button onClick={() => setShowDrafts(false)} className="text-discord-muted hover:text-discord-text p-1"><FiX size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {draftsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-10">
                  <FiClock size={28} className="text-discord-muted/40 mx-auto mb-2" />
                  <p className="text-discord-muted text-sm">No drafts saved yet.</p>
                  <p className="text-discord-muted/60 text-xs mt-1">Use "Save draft" in the header while composing.</p>
                </div>
              ) : drafts.map(draft => (
                <div key={draft._id} className="bg-discord-dark/60 border border-white/8 rounded-2xl p-4">
                  {draft.caption && (
                    <p className="text-discord-text text-sm mb-2 line-clamp-2">{draft.caption}</p>
                  )}
                  {draft.media?.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {draft.media.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-discord-hover flex-shrink-0">
                          {m.type === 'video'
                            ? <video src={m.url} className="w-full h-full object-cover" muted />
                            : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                        </div>
                      ))}
                      {draft.media.length > 3 && (
                        <div className="w-14 h-14 rounded-lg bg-discord-hover flex items-center justify-center text-discord-muted text-xs font-bold">
                          +{draft.media.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-discord-muted/60 text-[11px] mb-3">
                    Saved {draft.updatedAt ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true }) : ''}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => handlePublishDraft(draft._id)}
                      className="flex-1 discord-btn text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5">
                      <FiUpload size={12} /> Publish
                    </button>
                    <button onClick={() => handleDeleteDraft(draft._id)}
                      className="px-3 py-1.5 text-discord-red hover:bg-discord-red/10 rounded-lg transition-colors">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSoundPicker && (
        <SoundPicker onSelect={(sound) => { setSelectedSound(sound); setShowSoundPicker(false); }} onClose={() => setShowSoundPicker(false)} />
      )}
    </Layout>
  );
}
