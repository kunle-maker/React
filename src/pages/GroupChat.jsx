import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiUsers, FiInfo, FiTrash2, FiCopy, FiMoreVertical, FiLogOut, FiFlag, FiSmile, FiPaperclip, FiPhone, FiVideo, FiX, FiMoreHorizontal, FiSave, FiGlobe, FiEdit2, FiPlusSquare } from 'react-icons/fi';
import ImageCropModal from '../components/ImageCropModal';
import ReportModal from '../components/ReportModal';
import TranslateModal from '../components/TranslateModal';
import { format, isToday, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import LinkPreview from '../components/LinkPreview';
import EmojiStickerPicker from '../components/EmojiStickerPicker';
import { parseEmojisToHtml } from '../utils/emoji';
import { VerifiedBadge, SupaBadge } from '../components/UserBadge';
import API from '../utils/api';
import socket from '../utils/socket';
import { showToast } from '../utils/toast';
import { playSendPop } from '../utils/soundFx';
import { haptic } from '../utils/haptics';
import { FiPlay, FiMic, FiFile } from 'react-icons/fi';
import TwemojiTextarea from '../components/TwemojiTextarea';

const MSG_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '😡', '🔥', '💯'];

function VoiceNotePlayer({ src, duration: initDuration, isMine = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(initDuration || 0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef(null);

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); cancelAnimationFrame(rafRef.current); }
    else {
      a.playbackRate = speed;
      a.play().then(() => {
        setPlaying(true);
        const tick = () => { setCurrent(a.currentTime); rafRef.current = requestAnimationFrame(tick); };
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => {});
    }
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const pct = duration > 0 ? Math.min(current / duration, 1) : 0;
  const barColor = isMine ? 'bg-white/90' : 'bg-discord-brand';
  const trackColor = isMine ? 'bg-white/25' : 'bg-white/15';
  const textColor = isMine ? 'text-white/70' : 'text-discord-muted';
  const bars = [3,5,8,6,9,4,7,5,10,6,4,8,5,7,3,6,9,5,8,4,6,10,7,5,3,8,6,9,4,7];

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl min-w-[220px] max-w-[280px] ${isMine ? 'bg-discord-brand' : 'bg-white/8 border border-white/10'}`}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => { setPlaying(false); setCurrent(0); cancelAnimationFrame(rafRef.current); }}
      />
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-discord-brand/20 hover:bg-discord-brand/30'}`}
      >
        {playing
          ? <span className={`text-xs font-black tracking-tighter ${isMine ? 'text-white' : 'text-discord-brand'}`}>❙❙</span>
          : <FiPlay size={14} className={`ml-0.5 ${isMine ? 'text-white' : 'text-discord-brand'}`} />
        }
      </button>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div
          className="flex items-end gap-[2px] h-6 cursor-pointer"
          onClick={e => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = p * duration;
            setCurrent(p * duration);
          }}
        >
          {bars.map((h, i) => (
            <div key={i} className={`flex-1 rounded-full transition-all ${i / bars.length <= pct ? barColor : trackColor}`} style={{ height: `${(h / 10) * 100}%`, minHeight: 3 }} />
          ))}
        </div>
        <div className={`flex items-center justify-between text-[10px] font-mono ${textColor}`}>
          <span>{playing ? fmt(current) : fmt(duration)}</span>
          <button onClick={cycleSpeed} className={`font-bold text-[10px] px-1.5 py-0.5 rounded-full ${isMine ? 'text-white/80 hover:bg-white/20' : 'text-discord-muted hover:bg-white/10'}`}>{speed}×</button>
        </div>
      </div>
      <FiMic size={13} className={`flex-shrink-0 opacity-50 ${isMine ? 'text-white' : 'text-discord-muted'}`} />
    </div>
  );
}

function TwemojiEmoji({ emoji, size = 18 }) {
  try {
    const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
    return <img src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${cp}.png`} alt={emoji} width={size} height={size} className="inline-block select-none object-contain align-middle" />;
  } catch { return <span>{emoji}</span>; }
}

async function compressImage(file, maxW = 1280, quality = 0.82) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    let w = bitmap.width, h = bitmap.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise(resolve => canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(blob);
    }, 'image/jpeg', quality));
  } catch {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}

function dataURLToBlob(dataURL) {
  const [header, b64] = dataURL.split(',');
  const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function DateSeparator({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 py-2 px-2">
      <div className="flex-1 h-px bg-white/6" />
      <span className="text-[11px] text-discord-muted font-semibold px-2 py-0.5 rounded-full bg-white/4">{label}</span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

function CopiedToast({ show }) {
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
      <div className="bg-discord-dark border border-white/10 text-discord-text text-xs px-4 py-2 rounded-full shadow-xl backdrop-blur-xl">
        Copied to clipboard
      </div>
    </div>
  );
}

export default function GroupChat({ currentUser, unreadCounts }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [showCopied, setShowCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaAttachment, setMediaAttachment] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [fullscreenImg, setFullscreenImg] = useState(null);
  const [translateMsg, setTranslateMsg] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [swipingMsgId, setSwipingMsgId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordIntervalRef = useRef(null);
  const swipeTouchRef = useRef({ x: 0, y: 0, msgId: null, direction: null });
  const isAtBottomRef = useRef(true);
  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;
  const isChannel = group?.isChannel === true;
  const canPost = !isChannel || isAdmin;

  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);

  useEffect(() => {
    fetchGroup();
    fetchMessages();
    socket.joinGroup(groupId);
    return () => socket.leaveGroup(groupId);
  }, [groupId]);

  useEffect(() => {
    const handler = (e) => {
      const { message, group: g, groupId: evtGroupId } = e.detail;
      const msgGroupId = message?.groupId?.toString?.() || message?.groupId;
      const matches =
        g?._id === groupId ||
        evtGroupId === groupId ||
        msgGroupId === groupId;
      if (matches) {
        setMessages(prev => {
          const exists = prev.some(m => m._id?.toString() === message._id?.toString());
          if (exists) return prev;
          const filtered = prev.filter(m => typeof m._id !== 'number');
          return [...filtered, message];
        });
        if (isAtBottomRef.current) scrollToBottom();
        else setNewMsgCount(c => c + 1);
      }
    };
    window.addEventListener('newGroupMessage', handler);
    return () => window.removeEventListener('newGroupMessage', handler);
  }, [groupId]);

  useEffect(() => {
    const handler = (e) => {
      const { username, groupId: gId } = e.detail;
      if (gId === groupId && username !== currentUser?.username) {
        setTypingUsers(prev => [...new Set([...prev, username])]);
        setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== username)), 3000);
      }
    };
    window.addEventListener('groupTypingIndicator', handler);
    return () => window.removeEventListener('groupTypingIndicator', handler);
  }, [groupId]);

  useEffect(() => {
    const handleClickOutside = () => { setContextMenu(null); setShowMenu(false); setActiveReactionPicker(null); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { command } = e.detail;
      setNewMsg(command);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
      }, 50);
    };
    window.addEventListener('slashCommandInsert', handler);
    return () => window.removeEventListener('slashCommandInsert', handler);
  }, []);

  useEffect(() => {
    const onEdited = (e) => {
      const { messageId, text } = e.detail;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text, edited: true } : m));
    };
    const onUnsent = (e) => {
      const { messageId } = e.detail;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: '', unsent: true } : m));
    };
    window.addEventListener('groupMessageEdited', onEdited);
    window.addEventListener('groupMessageUnsent', onUnsent);
    return () => {
      window.removeEventListener('groupMessageEdited', onEdited);
      window.removeEventListener('groupMessageUnsent', onUnsent);
    };
  }, []);

  const [activeReactionPicker, setActiveReactionPicker] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const { messageId, reactions } = e.detail;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    window.addEventListener('messageReactionUpdated', handler);
    return () => window.removeEventListener('messageReactionUpdated', handler);
  }, []);

  const handleReactGroup = async (msg, emoji) => {
    setActiveReactionPicker(null);
    haptic('light');
    const myId = currentUser?._id || currentUser?.id;
    const existing = msg.reactions || [];
    const myEntry = existing.find(r => r.userId === myId || r.userId?._id === myId);
    const removing = myEntry?.emoji === emoji;
    let updated;
    if (removing) {
      updated = existing.filter(r => r.userId !== myId && r.userId?._id !== myId);
    } else if (myEntry) {
      updated = existing.map(r => (r.userId === myId || r.userId?._id === myId) ? { ...r, emoji } : r);
    } else {
      updated = [...existing, { userId: myId, emoji, reactedAt: new Date().toISOString() }];
    }
    setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, reactions: updated } : m));
    try { await API.reactToGroupMessage(groupId, msg._id, emoji); } catch {}
  };

  const handleEditSave = async (messageId) => {
    if (!editText.trim()) return;
    try {
      const data = await API.editGroupMessage(groupId, messageId, editText.trim());
      const updated = data.message || data;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: updated.text || editText.trim(), edited: true } : m));
    } catch {}
    setEditingMsgId(null);
    setEditText('');
  };

  const handleUnsend = async (messageId) => {
    setContextMenu(null);
    try {
      await API.unsendGroupMessage(groupId, messageId);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: '', unsent: true } : m));
    } catch {}
  };

  const handleEmojiButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    } else {
      setShowEmojiPicker(true);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const insertEmoji = (emoji) => {
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = newMsg.slice(0, start) + emoji + newMsg.slice(end);
    setNewMsg(text);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const fetchGroup = async () => {
    try {
      const data = await API.getGroup(groupId);
      setGroup(data);
    } catch { navigate('/groups'); }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await API.getGroupMessages(groupId);
      const msgs = Array.isArray(data) ? data : (data.messages || data.data || []);
      setMessages(msgs);
      scrollToBottom(true);
    } catch { }
    finally { setLoading(false); }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const MAX = 100 * 1024 * 1024;
    if (file.size > MAX) { showToast('File too large. Maximum size is 100 MB.', { type: 'error' }); return; }
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      setPendingImageFile(file);
      setMediaAttachment({ type: 'image', dataUrl: compressed, filename: file.name || 'image.jpg', mimeType: 'image/jpeg', size: file.size });
    } else if (file.type.startsWith('video/')) {
      setMediaAttachment({ type: 'video', file, filename: file.name, mimeType: file.type, size: file.size });
    } else if (file.type.startsWith('audio/')) {
      const reader = new FileReader();
      reader.onload = ev => setMediaAttachment({ type: 'audio', dataUrl: ev.target.result, file, filename: file.name, mimeType: file.type, size: file.size });
      reader.readAsDataURL(file);
    } else {
      setMediaAttachment({ type: 'file', file, filename: file.name, mimeType: file.type, size: file.size });
    }
  };

  const sendCallInvite = (isVideo = true) => {
    const roomId = `vesselx-group-${groupId}-${Date.now()}`;
    const url = `https://meet.jit.si/${roomId}#config.startWithVideoMuted=${!isVideo}`;
    const text = `[vx:call:${url}]`;
    const tempId = Date.now();
    const tempMsg = {
      _id: tempId,
      text,
      senderId: { _id: myId, username: currentUser?.username, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
      senderUsername: currentUser?.username,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();
    API.sendGroupMessage(groupId, text).catch(() => {});
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType });
        clearInterval(recordIntervalRef.current);
        const dur = recordDuration;
        try {
          const fd = new FormData();
          fd.append('file', blob, 'voice.webm');
          setSending(true);
          const uploadData = await API.uploadMessageMedia(fd);
          const url = uploadData?.url || uploadData?.secure_url || uploadData?.mediaUrl;
          if (!url) throw new Error('No URL');
          const mediaType = recorder.mimeType.split(';')[0] || 'audio/webm';
          const data = await API.sendGroupMessage(groupId, '', null, { type: 'audio', mediaUrl: url, mediaType, duration: dur });
          const realMsg = data?.message || {
            _id: Date.now(),
            type: 'audio',
            mediaUrl: url,
            mediaType,
            duration: dur,
            text: '',
            senderId: { _id: myId, username: currentUser?.username, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
            senderUsername: currentUser?.username,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, realMsg]);
          playSendPop();
          scrollToBottom();
        } catch {
          showToast('Failed to send voice note', { type: 'error' });
        } finally {
          setSending(false);
        }
        setRecordDuration(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch { showToast('Microphone access denied', { type: 'error' }); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMsg.trim() && !mediaAttachment) || sending) return;
    let text = newMsg.trim();
    let replyToId = null;
    if (replyingTo) {
      replyToId = replyingTo._id || null;
      const rawPreview = (replyingTo.text || '').replace(/^\[vx:[^\]]+\]\n?/, '').trim().slice(0, 60);
      const senderName = replyingTo.senderId?.username || replyingTo.senderUsername || 'someone';
      text = `↩ @${senderName}: ${rawPreview || '📷 Photo'}\n${text}`;
      setReplyingTo(null);
    }
    const savedAttachment = mediaAttachment;
    const savedMsg = newMsg;

    if (mediaAttachment?.type === 'image') {
      setSending(true);
      try {
        const blob = dataURLToBlob(mediaAttachment.dataUrl);
        const formData = new FormData();
        formData.append('file', blob, mediaAttachment.filename || 'image.jpg');
        const uploadData = await API.uploadMessageMedia(formData);
        const imageUrl =
          uploadData?.url || uploadData?.imageUrl || uploadData?.secure_url ||
          uploadData?.mediaUrl || uploadData?.fileUrl || uploadData?.link ||
          uploadData?.data?.url || uploadData?.data?.secure_url ||
          (typeof uploadData === 'string' ? uploadData : null);
        if (!imageUrl) throw new Error('No URL returned from upload');
        text = `[vx:img:${imageUrl}]${text ? '\n' + text : ''}`;
        setMediaAttachment(null);
      } catch {
        setSending(false);
        showToast('Image upload failed. Please try again.', { type: 'error' });
        return;
      }
    } else if (mediaAttachment && mediaAttachment.type !== 'image') {
      const att = mediaAttachment;
      setMediaAttachment(null);
      setSending(true);
      setNewMsg('');
      if (textareaRef.current) textareaRef.current.style.height = '42px';
      try {
        const formData = new FormData();
        if (att.type === 'video') {
          formData.append('file', att.file, att.filename);
          const uploadData = await API.uploadMessageMedia(formData);
          const url = uploadData?.url || uploadData?.secure_url || uploadData?.mediaUrl || (typeof uploadData === 'string' ? uploadData : null);
          if (!url) throw new Error('No URL');
          text = `[vx:video:${url}]${text ? '\n' + text : ''}`;
        } else if (att.type === 'audio') {
          if (att.file) {
            formData.append('file', att.file, att.filename);
            const uploadData = await API.uploadMessageMedia(formData);
            const url = uploadData?.url || uploadData?.secure_url || (typeof uploadData === 'string' ? uploadData : null);
            text = `[vx:audio:${url || att.dataUrl}]${text ? '\n' + text : ''}`;
          } else if (att.dataUrl) {
            text = `[vx:audio:${att.dataUrl}]${text ? '\n' + text : ''}`;
          }
        } else if (att.type === 'file') {
          formData.append('file', att.file, att.filename);
          const uploadData = await API.uploadMessageMedia(formData);
          const url = uploadData?.url || uploadData?.secure_url || uploadData?.mediaUrl || (typeof uploadData === 'string' ? uploadData : null);
          if (!url) throw new Error('No URL');
          const sizeKB = Math.round((att.size || 0) / 1024);
          text = `[vx:file:name=${uploadData?.fileName || att.filename}|size=${sizeKB}|type=${att.mimeType}|url=${url}]${text ? '\n' + text : ''}`;
        }
        const tempId = Date.now();
        const tempMsg = { _id: tempId, text, senderId: { _id: myId, username: currentUser?.username, name: currentUser?.name, profilePicture: currentUser?.profilePicture }, senderUsername: currentUser?.username, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        playSendPop();
        scrollToBottom();
        const data = await API.sendGroupMessage(groupId, text, replyToId);
        const realMsg = data?.message || data;
        if (realMsg?._id && realMsg._id !== tempId) setMessages(prev => prev.map(m => m._id === tempId ? { ...realMsg } : m));
      } catch { showToast('Upload failed. Please try again.', { type: 'error' }); }
      finally { setSending(false); }
      return;
    }

    setSending(true);
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }

    const tempId = Date.now();
    const tempMsg = {
      _id: tempId,
      text,
      senderId: { _id: myId, username: currentUser?.username, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
      senderUsername: currentUser?.username,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    playSendPop();
    scrollToBottom();
    try {
      const data = await API.sendGroupMessage(groupId, text, replyToId);
      const realMsg = data?.message || data;
      if (realMsg?._id && realMsg._id !== tempId) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...realMsg } : m));
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setNewMsg(savedMsg);
    }
    finally { setSending(false); }
  };

  const handleTyping = (e) => {
    const val = e.target.value;
    setNewMsg(val);
    socket.setGroupTyping({ groupId, username: currentUser?.username });
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  };

  const handleMentionSelect = (username) => {
    const ta = textareaRef.current;
    if (!ta) {
      setNewMsg(prev => {
        const atMatch = prev.match(/@(\w*)$/);
        if (atMatch) return prev.slice(0, prev.length - atMatch[0].length) + `@${username} `;
        return prev + `@${username} `;
      });
      setMentionQuery(null);
      return;
    }
    const cursor = ta.selectionStart;
    const textBefore = newMsg.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      const before = textBefore.slice(0, textBefore.length - atMatch[0].length);
      const after = newMsg.slice(cursor);
      const newVal = before + `@${username} ` + after;
      setNewMsg(newVal);
      const newCursor = before.length + username.length + 2;
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = newCursor; ta.focus(); }, 0);
    }
    setMentionQuery(null);
  };

  const mentionMembers = mentionQuery !== null
    ? (group?.members || []).filter(m => {
        const u = (m.username || m.user?.username || '').toLowerCase();
        const n = (m.name || m.user?.name || '').toLowerCase();
        return (u.includes(mentionQuery) || n.includes(mentionQuery)) && u !== currentUser?.username;
      }).slice(0, 6)
    : [];

  const handleMsgTouchStart = (e, msgId) => {
    swipeTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, msgId, direction: null };
  };

  const handleMsgTouchMove = (e, msgId) => {
    const dx = e.touches[0].clientX - swipeTouchRef.current.x;
    const dy = e.touches[0].clientY - swipeTouchRef.current.y;
    if (swipeTouchRef.current.direction === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        swipeTouchRef.current.direction = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }
    if (swipeTouchRef.current.direction === 'h' && dx > 0) {
      setSwipingMsgId(msgId);
      setSwipeOffset(Math.min(dx, 72));
    }
  };

  const handleMsgTouchEnd = (msg) => {
    if (swipeOffset > 50) {
      setReplyingTo(msg);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
    setSwipingMsgId(null);
    setSwipeOffset(0);
    swipeTouchRef.current = { x: 0, y: 0, msgId: null, direction: null };
  };

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
      setNewMsgCount(0);
    }, 80);
  };

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsAtBottom(near);
    if (near) setNewMsgCount(0);
  }, []);

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await API.leaveGroup(groupId);
      navigate('/groups');
    } catch (err) { showToast(err.message || 'Failed to leave group', { type: 'error' }); }
  };

  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    const senderUserId = msg.senderId?._id || msg.senderId;
    const senderName = msg.senderUsername || msg.senderId?.name || msg.senderId?.username;
    setContextMenu({ x: e.clientX, y: e.clientY, msg, senderUserId, senderName });
  };

  const copyMessage = (text) => {
    navigator.clipboard?.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    setContextMenu(null);
  };

  const isSentByMe = (msg) => {
    const sid = msg.senderId?._id || msg.senderId;
    return sid === myId || msg.senderUsername === currentUser?.username;
  };

  const groupedMessages = () => {
    const result = [];
    let lastDate = null;
    messages.forEach((msg, i) => {
      const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
      if (msgDate && msgDate !== lastDate) {
        result.push({ type: 'date', date: msg.createdAt, key: `date-${i}` });
        lastDate = msgDate;
      }
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const prevSenderId = prev ? (prev.senderId?._id || prev.senderId) : null;
      const thisSenderId = msg.senderId?._id || msg.senderId;
      const nextSenderId = next ? (next.senderId?._id || next.senderId) : null;
      const prevDate = prev?.createdAt ? new Date(prev.createdAt) : null;
      const thisDate = msg.createdAt ? new Date(msg.createdAt) : null;
      const nextDate = next?.createdAt ? new Date(msg.createdAt) : null;
      const timeDiff = prevDate && thisDate ? (thisDate - prevDate) / 60000 : 99;
      const timeDiffNext = next?.createdAt && msg.createdAt ? (new Date(next.createdAt) - new Date(msg.createdAt)) / 60000 : 99;
      const sameGroup = prevSenderId === thisSenderId && timeDiff < 7 && msgDate === lastDate;
      const hasNextSameSender = nextSenderId === thisSenderId && timeDiffNext < 3 && msgDate === (next?.createdAt ? new Date(next.createdAt).toDateString() : null);
      result.push({ type: 'message', msg, isFirstInGroup: !sameGroup, hasNextSameSender, key: msg._id || i });
    });
    return result;
  };

  const items = groupedMessages();

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-hidden">
      <div className="flex flex-col h-full relative bg-black overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 bg-black z-20 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="text-discord-muted hover:text-discord-text transition-colors -ml-1 p-1" onClick={() => navigate('/groups')}>
              <FiArrowLeft size={22} />
            </button>
            <div
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              onClick={() => navigate(`/groups/${groupId}/info`)}
            >
              {group?.profilePicture ? (
                <img src={API.getAvatarUrl(group.profilePicture, 80)} alt={group.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-discord-brand flex items-center justify-center flex-shrink-0">
                  <FiUsers size={16} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-discord-text truncate group-hover:underline">
                    {group?.name}
                  </span>
                  {isChannel && <span className="text-[10px] font-bold text-discord-brand bg-discord-brand/15 px-1.5 py-0.5 rounded-full border border-discord-brand/30 flex-shrink-0">📢 Channel</span>}
                </div>
                <p className="text-[11px] font-medium leading-none text-discord-muted mt-0.5">
                  {group?.members?.length || 0} {isChannel ? 'subscribers' : 'members'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-all"
              onClick={() => sendCallInvite(false)}
              title="Voice Call"
            >
              <FiPhone size={19} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-all"
              onClick={() => sendCallInvite(true)}
              title="Video Call"
            >
              <FiVideo size={19} />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-all"
              onClick={() => navigate(`/groups/${groupId}/members`)}
              title="Members"
            >
              <FiUsers size={19} />
            </button>
            <div className="relative">
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full text-discord-muted hover:text-discord-text hover:bg-white/5 transition-all"
                onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                title="More"
              >
                <FiMoreVertical size={19} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-40 z-50 backdrop-blur-xl animate-fade-in"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-discord-muted hover:bg-white/5 transition-colors"
                    onClick={() => { setShowMenu(false); navigate(`/groups/${groupId}/info`); }}
                  >
                    <FiInfo size={14} /> {isAdmin ? 'Group Settings' : 'Group Info'}
                  </button>
                  {!isAdmin && (
                    <button
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
                      onClick={() => { setShowMenu(false); handleLeave(); }}
                    >
                      <FiLogOut size={14} /> Leave Group
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 py-2 scroll-smooth no-scrollbar bg-black"
          onScroll={handleScroll}
          onClick={() => { if (showEmojiPicker) setShowEmojiPicker(false); }}
        >
          {loading ? (
            <div className="space-y-6 pt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-16 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-start justify-end h-full px-2 pb-8">
              <div className="w-20 h-20 rounded-2xl bg-discord-brand/10 flex items-center justify-center mb-4">
                 {group?.profilePicture ? (
                   <img src={API.getAvatarUrl(group.profilePicture, 120)} alt={group.name} className="w-full h-full rounded-2xl object-cover" />
                 ) : (
                   <FiUsers size={40} className="text-discord-brand" />
                 )}
              </div>
              <h2 className="text-3xl font-bold text-discord-text mb-2">Welcome to {group?.name}!</h2>
              <p className="text-discord-muted mb-6">This is the start of the {group?.name} group.</p>
              <div className="h-px w-full bg-discord-hover/50 mb-4" />
            </div>
          ) : items.map(item => {
            if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
            const { msg, isFirstInGroup, hasNextSameSender } = item;

            if (msg.type === 'system') {
              return (
                <div key={item.key} className="flex justify-center my-1.5">
                  <span className="text-xs text-white/35 bg-white/[0.06] px-3 py-1 rounded-full italic">{msg.text || msg.formattedText || ''}</span>
                </div>
              );
            }

            if (msg.unsent) {
              return (
                <div key={item.key} className={`flex ${isSentByMe(msg) ? 'justify-end' : 'justify-start'} mb-0.5`}>
                  <span className="text-xs italic text-white/30 px-3 py-1">This message was unsent</span>
                </div>
              );
            }

            const mine = isSentByMe(msg);
            const sender = msg.senderId || { username: msg.senderUsername, name: msg.senderUsername };
            const msgKey = msg._id;
            const isSwiping = swipingMsgId === msgKey;
            const baseRadius = 18;
            const borderRadius = mine
              ? `${baseRadius}px ${baseRadius}px ${hasNextSameSender ? 4 : baseRadius}px ${baseRadius}px`
              : `${baseRadius}px ${baseRadius}px ${baseRadius}px ${hasNextSameSender ? 4 : baseRadius}px`;
            const isEditing = editingMsgId === msg._id;

            return (
              <div
                key={item.key}
                className={`group flex ${mine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}
                onContextMenu={e => handleMessageContextMenu(e, msg)}
                onTouchStart={e => handleMsgTouchStart(e, msgKey)}
                onTouchMove={e => handleMsgTouchMove(e, msgKey)}
                onTouchEnd={() => handleMsgTouchEnd(msg)}
                style={isSwiping ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transition: 'transform 0.2s ease' }}
              >
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'} max-w-[78%]`}>
                  {!mine && isFirstInGroup && (
                    <span
                      className={`text-xs font-bold mb-0.5 px-1 cursor-pointer hover:underline ${sender.isSupa ? 'supa-chat-name' : ''}`}
                      style={sender.isSupa ? {} : { color: stringToColor(sender.username || '') }}
                      onClick={() => navigate(`/profile/${sender.username}`)}
                    >
                      {sender.name || sender.username}
                    </span>
                  )}
                  <div
                    className={`relative px-3.5 py-2 text-[15px] leading-relaxed break-words ${mine ? 'bg-white text-[#111]' : 'bg-[#1c1c1e] text-white'}`}
                    style={{ borderRadius }}
                  >
                    {isEditing ? (
                      <div className="min-w-[180px]">
                        <textarea className={`w-full bg-transparent text-sm resize-none outline-none ${mine ? 'text-[#111]' : 'text-white'}`} rows={2} value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) { e.preventDefault(); handleEditSave(msg._id); } if (e.key === 'Escape') { setEditingMsgId(null); setEditText(''); } }} autoFocus />
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => { setEditingMsgId(null); setEditText(''); }} className={`text-xs hover:underline ${mine ? 'text-[#333]' : 'text-white/60'}`}>Cancel</button>
                          <button onClick={() => handleEditSave(msg._id)} className="text-xs bg-discord-brand text-white px-2 py-0.5 rounded-md font-medium">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {(() => {
                          const text = msg.text || '';
                          const replyMatch = text.match(/^↩ (@[^\n]+)\n([\s\S]*)$/);
                          if (replyMatch) return (<div><div className={`flex items-center gap-1.5 text-xs mb-1 opacity-80 ${mine ? 'text-[#444]' : 'text-white/60'}`}><FiArrowLeft size={9} className="rotate-180 flex-shrink-0" /><span className="font-bold truncate">{replyMatch[1]}</span></div><FormattedText text={replyMatch[2].trim()} /></div>);
                          const imgMatch = text.match(/^\[vx:img:([^\]]+)\](.*)$/s);
                          const audioMatch = text.match(/^\[vx:audio:([^\]]+)\](.*)$/s);
                          const callMatch = text.match(/^\[vx:call:([^\]]+)\](.*)$/s);
                          if (msg.type === 'audio' && msg.mediaUrl) return <VoiceNotePlayer src={msg.mediaUrl} duration={msg.duration} isMine={mine} />;
                          if (audioMatch) return <VoiceNotePlayer src={audioMatch[1]} isMine={mine} />;
                          if (imgMatch) return (<div><img src={imgMatch[1]} alt="Image" className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer hover:opacity-90" onClick={() => setFullscreenImg(imgMatch[1])} loading="lazy" />{imgMatch[2]?.trim() && <div className="mt-1.5 text-sm"><FormattedText text={imgMatch[2].trim()} /></div>}</div>);
                          if (callMatch) return (<div className="flex flex-col gap-2 min-w-[180px]"><div className="flex items-center gap-2"><FiVideo size={14} className="text-discord-green" /><span className="text-xs font-semibold text-discord-green">Video Call</span></div><a href={callMatch[1]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-discord-brand text-white px-3 py-1.5 rounded-xl text-xs font-bold">Join Call</a></div>);
                          return <FormattedText text={text} />;
                        })()}
                        {msg.edited && <span className={`text-[10px] ml-1 select-none ${mine ? 'text-[#666]' : 'text-white/40'}`}>(edited)</span>}
                        {!msg.unsent && (<button className={`absolute ${mine ? '-left-8' : '-right-8'} top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1c1c1e] border border-white/10 rounded-full p-1.5 text-white/50 hover:text-white z-10`} onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(activeReactionPicker === msg._id ? null : msg._id); }}><FiSmile size={13} /></button>)}
                      </div>
                    )}
                  </div>
                  {msg.reactions?.length > 0 && !msg.unsent && (
                    <div className={`flex flex-wrap items-center gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => {
                        const myId = currentUser?._id || currentUser?.id;
                        const iAmReacted = msg.reactions.some(r => (r.userId === myId || r.userId?._id === myId) && r.emoji === emoji);
                        return (<button key={emoji} onClick={() => handleReactGroup(msg, emoji)} className={`flex items-center text-xs rounded-full px-2 py-0.5 border transition-all active:scale-95 ${iAmReacted ? 'bg-discord-brand/20 border-discord-brand/40 text-discord-brand' : 'bg-white/5 border-white/10 text-white hover:border-white/20'}`}><TwemojiEmoji emoji={emoji} size={14} /><span className="font-bold ml-0.5">{count}</span></button>);
                      })}
                    </div>
                  )}
                  {activeReactionPicker === msg._id && (<div className="flex items-center gap-1 bg-[#1c1c1e] border border-white/10 rounded-full px-2 py-1.5 shadow-2xl mt-1 w-fit animate-fade-in" onClick={e => e.stopPropagation()}>{MSG_REACTIONS.map(emoji => (<button key={emoji} onClick={() => handleReactGroup(msg, emoji)} className="hover:scale-125 transition-transform p-0.5"><TwemojiEmoji emoji={emoji} size={20} /></button>))}</div>)}
                  {!hasNextSameSender && (<div className={`flex items-center gap-1 mt-0.5 px-1 ${mine ? 'justify-end' : 'justify-start'}`}><span className="text-[10px] text-white/30">{msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}</span></div>)}
                  {!msg.unsent && msg.text && !msg.text.startsWith('[vx:') && <LinkPreview text={msg.text} />}
                </div>
              </div>
            );
          })}          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 justify-start mt-3 pl-1">
              <div className="bg-[#1c1c1e] rounded-[18px] px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Jump to bottom */}
        {!isAtBottom && newMsgCount > 0 && (
          <button
            className="absolute bottom-24 right-6 bg-discord-brand text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl z-30 animate-bounce"
            onClick={() => scrollToBottom()}
          >
            <span className="text-[11px] font-bold">{newMsgCount > 9 ? '9+' : newMsgCount}</span>
          </button>
        )}

        {/* Channel read-only notice */}
        {isChannel && !canPost && (
          <div className="px-4 py-4 bg-discord-bg border-t border-discord-hover/50 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-discord-hover/50 flex items-center justify-center text-discord-muted"><FiInfo size={20} /></div>
            <p className="text-discord-muted text-sm text-center">This is a broadcast channel. Only the owner can post.</p>
          </div>
        )}

        {/* Input */}
        {canPost && (
          <div className={`flex flex-col flex-shrink-0 bg-black transition-all duration-300 ${showEmojiPicker ? 'pb-0' : 'pb-safe'}`}>
            <form onSubmit={handleSend} className="px-4 py-3">
              {/* Reply Preview */}
              {replyingTo && (
                <div className="mb-3 p-3 bg-discord-hover/30 rounded-xl border border-discord-hover/50 flex items-center gap-3 animate-fade-in">
                   <div className="w-1 h-8 bg-discord-brand rounded-full" />
                   <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold text-discord-brand mb-0.5">Replying to @{replyingTo.senderId?.username || replyingTo.senderUsername}</p>
                     <p className="text-xs text-discord-muted truncate">{(replyingTo.text || '').replace(/^\[vx:[^\]]+\]\n?/, '').trim() || '📷 Photo'}</p>
                   </div>
                   <button type="button" onClick={() => setReplyingTo(null)} className="p-2 text-discord-muted hover:text-discord-red"><FiX size={18} /></button>
                </div>
              )}

              {/* Media Attachment Preview */}
              {mediaAttachment && (
                <div className="mb-3 p-3 bg-discord-hover/30 rounded-xl border border-discord-hover/50 flex items-center gap-3 animate-fade-in">
                  {mediaAttachment.type === 'image' && (
                    <img src={mediaAttachment.dataUrl} className="w-16 h-16 rounded-lg object-cover cursor-pointer flex-shrink-0" onClick={() => { setPendingImageSrc(mediaAttachment.dataUrl); setShowCropModal(true); }} />
                  )}
                  {mediaAttachment.type === 'video' && (
                    <div className="w-16 h-16 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <FiPlay size={20} className="text-white/70" />
                    </div>
                  )}
                  {mediaAttachment.type === 'audio' && (
                    <div className="w-16 h-16 rounded-lg bg-discord-brand/20 flex items-center justify-center flex-shrink-0 border border-discord-brand/20">
                      <FiMic size={20} className="text-discord-brand" />
                    </div>
                  )}
                  {mediaAttachment.type === 'file' && (
                    <div className="w-16 h-16 rounded-lg bg-white/6 flex items-center justify-center flex-shrink-0 border border-white/10">
                      <FiFile size={20} className="text-discord-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-discord-text truncate">{mediaAttachment.filename}</p>
                    <p className="text-xs text-discord-muted capitalize">{mediaAttachment.type} · {(mediaAttachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={() => setMediaAttachment(null)} className="p-2 text-discord-muted hover:text-discord-red flex-shrink-0"><FiX size={20} /></button>
                </div>
              )}

              {/* Mention Suggestions */}
              {mentionQuery !== null && mentionMembers.length > 0 && (
                <div className="mb-2 bg-discord-dark border border-discord-hover/50 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                  {mentionMembers.map((m) => {
                    const uname = m.username || m.user?.username;
                    const name = m.name || m.user?.name || uname;
                    return (
                      <button
                        key={uname}
                        type="button"
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                        onMouseDown={e => { e.preventDefault(); handleMentionSelect(uname); }}
                      >
                        <Avatar user={m.user || m} size={32} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-discord-text truncate">{name}</p>
                          <p className="text-xs text-discord-muted">@{uname}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-end gap-2 bg-[#1c1c1e] rounded-2xl px-3 py-2 min-h-[48px]">
                {!group?.textOnly && (
                  <button
                    type="button"
                    className="p-1 text-discord-muted hover:text-discord-text transition-colors mb-0.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FiPlusSquare size={22} className="fill-discord-muted/10" />
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip,application/x-zip-compressed" />
                  </button>
                )}

                <TwemojiTextarea
                  ref={textareaRef}
                  value={newMsg}
                  onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                  onFocus={() => setShowEmojiPicker(false)}
                  placeholder={`Message ${group?.name}`}
                  wrapperClassName="flex-1 min-w-0"
                  className="w-full bg-transparent text-[15px] text-white placeholder-white/30 outline-none resize-none py-1.5 max-h-40 no-scrollbar"
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />

                <div className="flex items-center gap-2 mb-0.5">
                  <button
                    type="button"
                    className={`p-1 transition-colors ${showEmojiPicker ? 'text-discord-brand' : 'text-discord-muted hover:text-discord-text'}`}
                    onClick={handleEmojiButtonClick}
                  >
                    <FiSmile size={22} />
                  </button>
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1 text-red-500 hover:text-red-400 transition-all active:scale-90 animate-pulse"
                      title="Stop recording"
                    >
                      <FiMic size={22} />
                      <span className="text-[10px] text-red-400 font-bold ml-0.5">{recordDuration}s</span>
                    </button>
                  ) : newMsg.trim() || mediaAttachment ? (
                    <button type="submit" className="p-1 text-discord-brand hover:text-discord-brand-light transition-all active:scale-90">
                      <FiSend size={22} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-1 text-discord-muted hover:text-discord-brand transition-all active:scale-90"
                      title="Record voice note"
                    >
                      <FiMic size={22} />
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Emoji Keyboard */}
            {showEmojiPicker && (
              <div className="w-full bg-discord-bg animate-slide-up border-t border-discord-hover/50" style={{ height: '320px' }}>
                <EmojiStickerPicker
                  onSelectEmoji={insertEmoji}
                  onSelectSticker={async (sticker) => {
                    setShowEmojiPicker(false);
                    const stickerText = `[vx:img:${sticker.url}]`;
                    const tempId = Date.now();
                    const tempMsg = {
                      _id: tempId,
                      text: stickerText,
                      senderId: { _id: myId, username: currentUser?.username, name: currentUser?.name, profilePicture: currentUser?.profilePicture },
                      senderUsername: currentUser?.username,
                      createdAt: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, tempMsg]);
                    scrollToBottom();
                    try {
                      await API.sendGroupMessage(groupId, stickerText);
                    } catch {}
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                  anchor="keyboard"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-36 backdrop-blur-xl"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); setTimeout(() => textareaRef.current?.focus(), 100); }}
            >
              ↩ Reply
            </button>
          )}
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => copyMessage(contextMenu.msg.text)}
            >
              <FiCopy size={13} /> Copy Text
            </button>
          )}
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-brand hover:bg-discord-brand/10 transition-colors"
              onClick={() => { setTranslateMsg(contextMenu.msg.text); setContextMenu(null); }}
            >
              <FiGlobe size={13} /> Translate
            </button>
          )}
          {!contextMenu.msg.unsent && contextMenu.senderUserId === myId && !contextMenu.msg.text?.startsWith('[vx:') && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => {
                setEditingMsgId(contextMenu.msg._id);
                setEditText(contextMenu.msg.text || '');
                setContextMenu(null);
              }}
            >
              <FiEdit2 size={13} /> Edit Message
            </button>
          )}
          {!contextMenu.msg.unsent && contextMenu.senderUserId === myId && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
              onClick={() => handleUnsend(contextMenu.msg._id)}
            >
              <FiTrash2 size={13} /> Unsend
            </button>
          )}
          {contextMenu.senderUserId && contextMenu.senderUserId !== myId && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
              onClick={() => {
                setReportTarget({ type: 'user', id: contextMenu.senderUserId, name: contextMenu.senderName });
                setContextMenu(null);
              }}
            >
              <FiFlag size={13} /> Report User
            </button>
          )}
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
            onClick={() => {
              setReportTarget({ type: 'group', id: groupId, name: group?.name });
              setContextMenu(null);
            }}
          >
            <FiFlag size={13} /> Report Group
          </button>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          type={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-36 backdrop-blur-xl animate-fade-in"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); setTimeout(() => textareaRef.current?.focus(), 100); }}
            >
              ↩ Reply
            </button>
          )}
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => copyMessage(contextMenu.msg.text)}
            >
              <FiCopy size={13} /> Copy Text
            </button>
          )}
          {!contextMenu.msg.unsent && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-brand hover:bg-discord-brand/10 transition-colors"
              onClick={() => { setTranslateMsg(contextMenu.msg.text); setContextMenu(null); }}
            >
              <FiGlobe size={13} /> Translate
            </button>
          )}
          {!contextMenu.msg.unsent && contextMenu.senderUserId === myId && !contextMenu.msg.text?.startsWith('[vx:') && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => {
                setEditingMsgId(contextMenu.msg._id);
                setEditText(contextMenu.msg.text || '');
                setContextMenu(null);
              }}
            >
              <FiEdit2 size={13} /> Edit Message
            </button>
          )}
          {!contextMenu.msg.unsent && contextMenu.senderUserId === myId && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
              onClick={() => handleUnsend(contextMenu.msg._id)}
            >
              <FiTrash2 size={13} /> Unsend
            </button>
          )}
          {contextMenu.senderUserId && contextMenu.senderUserId !== myId && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
              onClick={() => {
                setReportTarget({ type: 'user', id: contextMenu.senderUserId, name: contextMenu.senderName });
                setContextMenu(null);
              }}
            >
              <FiFlag size={13} /> Report User
            </button>
          )}
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
            onClick={() => {
              setReportTarget({ type: 'group', id: groupId, name: group?.name });
              setContextMenu(null);
            }}
          >
            <FiFlag size={13} /> Report Group
          </button>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          type={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}

      <CopiedToast show={showCopied} />

      {/* Translate Modal */}
      {translateMsg !== null && (
        <TranslateModal text={translateMsg} onClose={() => setTranslateMsg(null)} />
      )}

      {/* Image Crop Modal */}
      {showCropModal && pendingImageSrc && (
        <ImageCropModal
          src={pendingImageSrc}
          aspectRatio={null}
          onCrop={(croppedFile, previewUrl) => {
            const reader = new FileReader();
            reader.onload = ev => {
              setMediaAttachment(prev => ({
                ...prev,
                type: 'image',
                dataUrl: ev.target.result,
                filename: pendingImageFile?.name || 'image.jpg',
                mimeType: 'image/jpeg',
                size: croppedFile.size,
              }));
            };
            reader.readAsDataURL(croppedFile);
            setShowCropModal(false);
            setPendingImageSrc(null);
          }}
          onCancel={() => {
            setShowCropModal(false);
            setPendingImageSrc(null);
          }}
        />
      )}

      {/* Image Fullscreen */}
      {fullscreenImg && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={() => setFullscreenImg(null)}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFullscreenImg(null)} className="text-white/70 hover:text-white transition-colors p-1">
              <FiX size={24} />
            </button>
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = fullscreenImg;
                a.download = 'image.jpg';
                a.click();
              }}
              className="text-white/70 hover:text-white transition-colors p-1"
              title="Save to device"
            >
              <FiSave size={22} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <img
              src={fullscreenImg}
              alt="Full view"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: 'calc(100vh - 100px)' }}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

function stringToColor(str) {
  const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4', '#9b59b6', '#e67e22'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
