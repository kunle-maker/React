import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiMessageSquare, FiSearch, FiCheck, FiCheckCircle, FiTrash2, FiCopy, FiX, FiMoreHorizontal, FiFlag, FiSmile, FiPaperclip, FiPhone, FiVideo, FiPlay, FiShare2, FiSave } from 'react-icons/fi';
import ImageCropModal from '../components/ImageCropModal';
import ReportModal from '../components/ReportModal';
import { formatDistanceToNow, format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import LinkPreview from '../components/LinkPreview';
import EmojiPicker from '../components/EmojiPicker';
import { parseEmojisToHtml } from '../utils/emoji';
import API from '../utils/api';
import socket from '../utils/socket';

function VideoFullscreenModal({ src, onClose }) {
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.play().catch(() => {});
    return () => { if (el) el.pause(); };
  }, []);

  const handleSave = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'video.mp4';
    a.click();
    setShowMenu(false);
  };

  const handleShare = async () => {
    setShowMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Video', url: src });
      } catch {}
    } else {
      navigator.clipboard?.writeText(src);
      alert('Video link copied!');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
          <FiX size={24} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <FiMoreHorizontal size={24} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1e2030] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px] z-10">
              <button
                onClick={handleShare}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors"
              >
                <FiShare2 size={16} /> Share
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors"
              >
                <FiSave size={16} /> Save to device
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="max-w-full max-h-full w-full"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        />
      </div>
    </div>
  );
}

function ImageFullscreenModal({ src, onClose }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleSave = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'image.jpg';
    a.click();
    setShowMenu(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
          <FiX size={24} />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <FiMoreHorizontal size={24} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1e2030] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px] z-10">
              <button
                onClick={handleSave}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors"
              >
                <FiSave size={16} /> Save to device
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <img
          src={src}
          alt="Full view"
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        />
      </div>
    </div>
  );
}

function VideoMessage({ src }) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [duration, setDuration] = useState(null);
  const videoRef = useRef(null);

  const handleSave = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = 'video.mp4';
    a.click();
    setShowMenu(false);
  };

  const handleShare = async () => {
    setShowMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Video', url: src });
      } catch {}
    } else {
      navigator.clipboard?.writeText(src);
      alert('Video link copied!');
    }
  };

  const formatDuration = (secs) => {
    if (!secs || !isFinite(secs)) return null;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-black cursor-pointer" style={{ width: 220, maxWidth: '100%' }}>
        <video
          ref={videoRef}
          src={src}
          className="w-full object-cover"
          style={{ height: 160, opacity: 0.7 }}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={e => setDuration(e.target.duration)}
          onClick={() => setShowFullscreen(true)}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={() => setShowFullscreen(true)}
        >
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <FiPlay size={20} className="text-white ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow">
          <FiVideo size={12} />
          {duration && <span>{formatDuration(duration)}</span>}
        </div>
        <div className="absolute top-2 right-2">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <FiMoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1e2030] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[150px] z-10">
              <button
                onClick={e => { e.stopPropagation(); handleShare(); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors"
              >
                <FiShare2 size={14} /> Share
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleSave(); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors"
              >
                <FiSave size={14} /> Save to device
              </button>
            </div>
          )}
        </div>
      </div>
      {showFullscreen && <VideoFullscreenModal src={src} onClose={() => setShowFullscreen(false)} />}
    </>
  );
}

async function compressImage(file, maxW = 1280, quality = 0.82) {
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

function MessageContent({ msg, onOpenImage }) {
  const text = msg.text || '';
  const imgMatch = text.match(/^\[vx:img:([^\]]+)\](.*)$/s);
  const audioMatch = text.match(/^\[vx:audio:(data:[^,]+,[^\]]+)\](.*)$/s);
  const callMatch = text.match(/^\[vx:call:([^\]]+)\](.*)$/s);
  const fileMatch = text.match(/^\[vx:file:name=([^|]+)\|size=([^|]+)\|type=([^\]]+)\](.*)$/s);
  const videoMatch = text.match(/^\[vx:video:([^\]]+)\](.*)$/s);

  if (videoMatch) {
    return (
      <div>
        <VideoMessage src={videoMatch[1]} />
        {videoMatch[2]?.trim() && <div className="mt-1.5 text-sm"><FormattedText text={videoMatch[2].trim()} /></div>}
      </div>
    );
  }

  if (imgMatch) {
    return (
      <div>
        <img
          src={imgMatch[1]}
          alt="Image"
          className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onOpenImage?.(imgMatch[1])}
          loading="lazy"
        />
        {imgMatch[2]?.trim() && <div className="mt-1.5 text-sm"><FormattedText text={imgMatch[2].trim()} /></div>}
      </div>
    );
  }

  if (audioMatch) {
    return (
      <div className="flex flex-col gap-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <FiMic size={14} className="text-discord-brand flex-shrink-0" />
          <span className="text-xs text-discord-muted">Voice message</span>
        </div>
        <audio controls src={audioMatch[1]} className="w-full max-w-[240px]" style={{ height: '36px' }} />
        {audioMatch[2]?.trim() && <div className="mt-1 text-sm"><FormattedText text={audioMatch[2].trim()} /></div>}
      </div>
    );
  }

  if (callMatch) {
    const callUrl = callMatch[1];
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <div className="flex items-center gap-2">
          <FiVideo size={14} className="text-discord-green flex-shrink-0" />
          <span className="text-xs font-semibold text-discord-green">Video Call</span>
        </div>
        <a
          href={callUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-discord-brand/90 hover:bg-discord-brand text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <FiVideo size={14} /> Join Call
        </a>
        {callMatch[2]?.trim() && <div className="mt-1 text-sm"><FormattedText text={callMatch[2].trim()} /></div>}
      </div>
    );
  }

  if (fileMatch) {
    const [, name, size, type, rest] = fileMatch;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5">
          <FiFile size={18} className="text-discord-brand flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-discord-text truncate max-w-[180px]">{name}</p>
            <p className="text-[11px] text-discord-muted">{(parseInt(size)/1024).toFixed(1)} KB</p>
          </div>
        </div>
        {rest?.trim() && <div className="mt-1 text-sm"><FormattedText text={rest.trim()} /></div>}
      </div>
    );
  }

  return <FormattedText text={text} />;
}

function JitsiModal({ roomUrl, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-discord-dark border-b border-white/10 flex-shrink-0">
        <span className="text-sm font-bold text-discord-text flex items-center gap-2"><FiVideo size={16} className="text-discord-green" /> Live Call</span>
        <button onClick={onClose} className="text-discord-muted hover:text-discord-red transition-colors p-1"><FiX size={20} /></button>
      </div>
      <iframe
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
        title="Video Call"
      />
    </div>
  );
}

function DateSeparator({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-white/5" />
      <span className="text-[11px] text-discord-muted font-semibold px-3 py-1 rounded-full bg-white/4 border border-white/6">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function formatConvTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

function getMessagePreview(text) {
  if (!text) return '';
  if (/^\[vx:video:/.test(text)) return '📹 Video';
  if (/^\[vx:img:/.test(text)) return '📷 Photo';
  if (/^\[vx:audio:/.test(text)) return '🎤 Voice message';
  if (/^\[vx:call:/.test(text)) return '📞 Video Call';
  const fileMatch = text.match(/^\[vx:file:name=([^|]+)\|/);
  if (fileMatch) return `📎 ${fileMatch[1]}`;
  return text;
}

export default function Messages({ currentUser, unreadCounts }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [convsLoading, setConvsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [convMenu, setConvMenu] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaAttachment, setMediaAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [jitsiUrl, setJitsiUrl] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState(null);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const [fullscreenImg, setFullscreenImg] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordIntervalRef = useRef(null);
  const isMobile = window.innerWidth < 768;

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (username) openConversation(username);
  }, [username]);

  useEffect(() => {
    const handler = (e) => {
      const { sender, message } = e.detail;
      if (activeConv?.username === sender?.username) {
        setMessages(prev => [...prev, message]);
        if (isAtBottom) scrollToBottom();
        else setNewMsgCount(c => c + 1);
        API.markConversationRead(sender.username).catch(() => {});
      } else {
        setConversations(prev => {
          const existing = prev.find(c => c.username === sender?.username);
          const updated = {
            userId: sender._id,
            username: sender.username,
            name: sender.name,
            profilePicture: sender.profilePicture,
            isOnline: sender.isOnline,
            isSupa: sender.isSupa,
            isVerified: sender.isVerified,
            lastMessage: getMessagePreview(message.text),
            lastMessageTime: message.createdAt,
            unreadCount: (existing?.unreadCount || 0) + 1,
          };
          if (existing) {
            return [updated, ...prev.filter(c => c.username !== sender?.username)];
          }
          return [updated, ...prev];
        });
      }
    };
    window.addEventListener('newMessage', handler);
    return () => window.removeEventListener('newMessage', handler);
  }, [activeConv, isAtBottom]);

  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail;
      if (activeConv && userId === activeConv.userId) {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };
    window.addEventListener('typingIndicator', handler);
    return () => window.removeEventListener('typingIndicator', handler);
  }, [activeConv]);

  useEffect(() => {
    const handleClickOutside = () => { setContextMenu(null); setConvMenu(null); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const insertEmoji = (emoji) => {
    const ta = textareaRef.current;
    if (!ta) { setNewMsg(prev => prev + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setNewMsg(prev => prev.slice(0, start) + emoji + prev.slice(end));
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    }, 0);
  };

  const fetchConversations = async () => {
    setConvsLoading(true);
    try {
      API.clearCache('/api/conversations');
      const data = await API.getConversations();
      const raw = Array.isArray(data) ? data : [];
      const normalized = raw.map(c => {
        if (c.user) {
          return {
            userId: c.user._id,
            username: c.user.username,
            name: c.user.name,
            profilePicture: c.user.profilePicture,
            isOnline: c.user.isOnline,
            isSupa: c.user.isSupa,
            isVerified: c.user.isVerified,
            lastMessage: getMessagePreview(c.lastMessage?.text || ''),
            lastMessageTime: c.lastMessage?.createdAt || null,
            unreadCount: c.unreadCount || 0,
            isMine: c.lastMessage?.isMine || false,
          };
        }
        return c;
      });
      setConversations(normalized);
    } catch { setConversations([]); }
    finally { setConvsLoading(false); }
  };

  const openConversation = async (uname) => {
    setLoading(true);
    setMessages([]);
    setNewMsgCount(0);
    try {
      const data = await API.getConversation(uname);
      setActiveConv(data.targetUser);
      setMessages(data.messages || []);
      setConversations(prev => prev.map(c => c.username === uname ? { ...c, unreadCount: 0 } : c));
      await API.markConversationRead(uname).catch(() => {});
      if (!conversations.find(c => c.username === uname)) {
        fetchConversations();
      }
    } catch { }
    finally { setLoading(false); scrollToBottom(true); }
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => {
        setPendingImageSrc(ev.target.result);
        setPendingImageFile(file);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      recordChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onload = ev => {
          setMediaAttachment({ type: 'audio', dataUrl: ev.target.result, filename: 'voice.webm', mimeType: recorder.mimeType, size: blob.size });
        };
        reader.readAsDataURL(blob);
        clearInterval(recordIntervalRef.current);
        setRecordDuration(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch { alert('Microphone access denied'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendCallInvite = async (isVideo = true) => {
    if (!activeConv) return;
    const roomId = `vesselx-${currentUser.username}-${activeConv.username}-${Date.now()}`;
    const url = `https://meet.jit.si/${roomId}#config.startWithVideoMuted=${!isVideo}`;
    setJitsiUrl(url);
    const text = `[vx:call:${url}]`;
    const myId = currentUser?._id || currentUser?.id;
    const tempMsg = { _id: Date.now(), text, senderId: myId, createdAt: new Date().toISOString(), status: 'sent' };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();
    try { await API.sendMessage({ receiverUsername: activeConv.username, text }); } catch {}
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMsg.trim() && !mediaAttachment) || !activeConv || sending) return;
    let text = newMsg.trim();
    const savedAttachment = mediaAttachment;
    const savedMsg = newMsg;
    setSending(true);
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }
    if (mediaAttachment) {
      if (mediaAttachment.type === 'image') {
        text = `[vx:img:${mediaAttachment.dataUrl}]${text ? '\n' + text : ''}`;
      } else if (mediaAttachment.type === 'audio') {
        text = `[vx:audio:${mediaAttachment.dataUrl}]${text ? '\n' + text : ''}`;
      } else if (mediaAttachment.type === 'video') {
        try {
          const formData = new FormData();
          if (mediaAttachment.file) {
            formData.append('file', mediaAttachment.file, mediaAttachment.filename);
          } else {
            const res = await fetch(mediaAttachment.dataUrl);
            const blob = await res.blob();
            formData.append('file', blob, mediaAttachment.filename || 'video.mp4');
          }
          const uploadData = await API.uploadMessageMedia(formData);
          text = `[vx:video:${uploadData.url}]${text ? '\n' + text : ''}`;
        } catch {
          text = `[vx:video:${mediaAttachment.dataUrl}]${text ? '\n' + text : ''}`;
        }
      } else if (mediaAttachment.type === 'file') {
        text = `[vx:file:name=${mediaAttachment.filename}|size=${mediaAttachment.size}|type=${mediaAttachment.mimeType}]${text ? '\n' + text : ''}`;
      }
      setMediaAttachment(null);
    }
    const myId = currentUser?._id || currentUser?.id;
    const tempMsg = {
      _id: Date.now(),
      text,
      senderId: myId,
      createdAt: new Date().toISOString(),
      status: 'sent'
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();
    setConversations(prev => {
      const existing = prev.find(c => c.username === activeConv.username);
      const updated = {
        ...(existing || activeConv),
        lastMessage: getMessagePreview(text),
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isMine: true,
      };
      return [updated, ...prev.filter(c => c.username !== activeConv.username)];
    });
    try {
      await API.sendMessage({ receiverUsername: activeConv.username, text });
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      setMediaAttachment(savedAttachment);
      setNewMsg(savedMsg);
      if (textareaRef.current) {
        textareaRef.current.value = savedMsg;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
      }
    }
    finally { setSending(false); }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    socket.setTyping({ receiverId: activeConv?.userId || activeConv?._id || activeConv?.id });
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

  const searchHandler = async (q) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchUsers([]); return; }
    try {
      const res = await API.searchUsers(q);
      setSearchUsers(Array.isArray(res) ? res : res.users || []);
    } catch { setSearchUsers([]); }
  };

  const isSentByMe = (msg) => {
    const myId = currentUser?._id || currentUser?.id;
    return msg.senderId === myId || msg.senderId?._id === myId || msg.senderUsername === currentUser?.username;
  };

  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const copyMessage = (text) => {
    navigator.clipboard?.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
    setContextMenu(null);
  };

  const filteredConvs = searchQ
    ? conversations.filter(c =>
        c.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        c.username?.toLowerCase().includes(searchQ.toLowerCase())
      )
    : conversations;

  const buildMessageItems = () => {
    const result = [];
    let lastDateStr = null;
    const myId = currentUser?._id || currentUser?.id;
    messages.forEach((msg, i) => {
      const msgDateStr = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
      if (msgDateStr && msgDateStr !== lastDateStr) {
        result.push({ type: 'date', date: msg.createdAt, key: `date-${i}` });
        lastDateStr = msgDateStr;
      }
      const mine = isSentByMe(msg);
      const prev = messages[i - 1];
      const prevMine = prev ? isSentByMe(prev) : null;
      const timeDiff = prev?.createdAt && msg.createdAt
        ? differenceInMinutes(new Date(msg.createdAt), new Date(prev.createdAt))
        : 99;
      const grouped = prev && prevMine === mine && timeDiff < 5 && msgDateStr === (prev?.createdAt ? new Date(prev.createdAt).toDateString() : null);
      result.push({ type: 'message', msg, mine, grouped, key: msg._id || i });
    });
    return result;
  };

  const ConvList = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <h2 className="font-bold text-discord-text mb-3 text-lg tracking-tight">Messages</h2>
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
          <input
            type="text"
            value={searchQ}
            onChange={e => searchHandler(e.target.value)}
            placeholder="Search or start new..."
            className="discord-input pl-9 py-2 text-sm rounded-xl w-full"
          />
          {searchQ && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text"
              onClick={() => { setSearchQ(''); setSearchUsers([]); }}
            >
              <FiX size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {searchQ && searchUsers.length > 0 ? (
          <div className="p-2">
            <p className="px-2 py-1.5 text-[11px] text-discord-muted font-bold uppercase tracking-wider">People</p>
            {searchUsers.map(u => (
              <div
                key={u._id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors rounded-xl"
                onClick={() => { setSearchQ(''); setSearchUsers([]); navigate(`/messages/${u.username}`); }}
              >
                <Avatar user={u} size={38} showStatus />
                <div>
                  <p className="text-discord-text text-sm font-semibold">{u.name}</p>
                  <p className="text-discord-muted text-xs">@{u.username}</p>
                </div>
              </div>
            ))}
          </div>
        ) : searchQ && searchUsers.length === 0 ? (
          <div className="text-center py-8 text-discord-muted text-sm px-4">
            <p className="mb-1 font-medium">No users found</p>
            <p className="text-xs opacity-70">Try a different name or username</p>
          </div>
        ) : convsLoading ? (
          <div className="space-y-0 p-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-28 rounded" />
                  <div className="skeleton h-2.5 w-40 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center py-10 px-6 text-discord-muted">
            <div className="w-14 h-14 rounded-2xl bg-white/4 flex items-center justify-center mx-auto mb-3">
              <FiMessageSquare size={24} className="opacity-50" />
            </div>
            <p className="font-semibold text-discord-text text-sm mb-1">No conversations yet</p>
            <p className="text-xs opacity-70">Search for someone above to start chatting</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConvs.map(c => (
              <div
                key={c.userId || c.username}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all rounded-xl relative group
                  ${activeConv?.username === c.username
                    ? 'bg-discord-brand/15 border border-discord-brand/20'
                    : 'hover:bg-white/5'
                  }`}
                onClick={() => navigate(`/messages/${c.username}`)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setConvMenu({ username: c.username, x: e.clientX, y: e.clientY }); }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={c} size={40} showStatus={!c.isSupa} supaRing={true} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-1">
                    <span className={`font-semibold text-sm truncate ${c.isSupa ? 'supa-chat-name' : 'text-discord-text'}`}>
                      {c.name || c.username}
                    </span>
                    <span className="text-discord-muted text-[11px] flex-shrink-0">{formatConvTime(c.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate flex-1 flex items-center gap-1 ${c.unreadCount > 0 ? 'text-discord-text font-medium' : 'text-discord-muted'}`}>
                      {c.isMine && <span className="text-discord-muted flex-shrink-0">You: </span>}
                      {c.lastMessage ? (() => {
                          const preview = getMessagePreview(c.lastMessage);
                          const display = preview.length > 40 ? preview.slice(0, 40) + '…' : preview;
                          return (
                            <span
                              className="truncate twemoji-inline"
                              dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(display) }}
                            />
                          );
                        })() : (
                        <span className="italic">Start a conversation</span>
                      )}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="badge flex-shrink-0">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const items = buildMessageItems();

  const ChatArea = activeConv ? (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6 backdrop-blur-xl bg-discord-bg/80 flex-shrink-0">
        {isMobile && (
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => { setActiveConv(null); navigate('/messages'); }}>
            <FiArrowLeft size={20} />
          </button>
        )}
        <div
          className="cursor-pointer flex items-center gap-3 flex-1 min-w-0 group"
          onClick={() => navigate(`/profile/${activeConv.username}`)}
        >
          <Avatar user={activeConv} size={36} showStatus={!activeConv.isSupa} supaRing={true} />
          <div className="min-w-0">
            <p className={`text-sm group-hover:underline truncate ${activeConv.isSupa ? 'supa-chat-name' : 'font-bold text-discord-text'}`}>{activeConv.name}</p>
            <p className={`text-xs font-medium ${activeConv.isOnline ? 'text-discord-green' : 'text-discord-muted'}`}>
              {activeConv.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl text-discord-muted hover:text-discord-green hover:bg-discord-green/10 transition-colors"
            onClick={() => sendCallInvite(false)}
            title="Voice Call"
          >
            <FiPhone size={17} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl text-discord-muted hover:text-discord-green hover:bg-discord-green/10 transition-colors"
            onClick={() => sendCallInvite(true)}
            title="Video Call"
          >
            <FiVideo size={17} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="space-y-4 pt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex items-end gap-2 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className={`skeleton h-9 rounded-2xl ${i % 3 === 0 ? 'w-32' : 'w-48'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <Avatar user={activeConv} size={72} className="mx-auto" />
            </div>
            <p className="font-bold text-discord-text text-lg">{activeConv.name}</p>
            <p className="text-discord-muted text-sm">@{activeConv.username}</p>
            <div className="mt-3 px-4 py-2.5 rounded-full bg-white/4 border border-white/6">
              <p className="text-discord-muted text-sm">This is the beginning of your conversation</p>
            </div>
          </div>
        ) : items.map(item => {
          if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
          const { msg, mine, grouped } = item;
          return (
            <div
              key={item.key}
              className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-4'} group`}
              onContextMenu={e => handleMessageContextMenu(e, msg)}
            >
              {!mine && (
                <div className="w-8 flex-shrink-0">
                  {!grouped ? (
                    <Avatar user={activeConv} size={32} />
                  ) : (
                    <span className="text-discord-muted text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                    </span>
                  )}
                </div>
              )}
              <div className={`max-w-[72%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className={`px-3.5 py-2.5 text-sm shadow-sm
                  ${mine
                    ? 'bg-discord-brand text-white rounded-2xl rounded-br-md'
                    : 'bg-white/6 border border-white/5 text-discord-text rounded-2xl rounded-bl-md'
                  }
                  ${grouped ? (mine ? 'rounded-tr-lg' : 'rounded-tl-lg') : ''}
                `}>
                  <MessageContent msg={msg} onOpenImage={setFullscreenImg} />
                </div>
                {msg.text && !msg.text.startsWith('[vx:') && <LinkPreview text={msg.text} />}
                <div className={`flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'flex-row-reverse' : ''}`}>
                  <span className="text-discord-muted text-[10px]">
                    {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                  </span>
                  {mine && (
                    <span>
                      {msg.status === 'read'
                        ? <FiCheckCircle size={10} className="text-discord-brand" />
                        : <FiCheck size={10} className="text-discord-muted" />
                      }
                    </span>
                  )}
                </div>
              </div>
              {mine && (
                <span className="text-discord-muted text-[10px] mb-2 opacity-0 group-hover:opacity-100 transition-opacity self-end">
                  {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                </span>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-end gap-2 mt-3">
            <Avatar user={activeConv} size={32} />
            <div className="bg-white/6 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="typing-indicator"><span/><span/><span/></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to bottom */}
      {!isAtBottom && (
        <button
          className="absolute bottom-28 right-4 discord-btn w-10 h-10 rounded-full flex items-center justify-center shadow-xl text-sm"
          onClick={() => scrollToBottom()}
        >
          {newMsgCount > 0 ? (
            <span className="text-[11px] font-bold">{newMsgCount > 9 ? '9+' : newMsgCount}</span>
          ) : (
            <span>↓</span>
          )}
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 pt-3 pb-20 md:pb-3 border-t border-white/6 flex-shrink-0">
        {/* Media Preview */}
        {mediaAttachment && (
          <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {mediaAttachment.type === 'image' && (
              <img src={mediaAttachment.dataUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-discord-text font-medium truncate">{mediaAttachment.filename}</p>
              <p className="text-[11px] text-discord-muted">{(mediaAttachment.size / 1024).toFixed(1)} KB</p>
            </div>
            <button type="button" onClick={() => setMediaAttachment(null)} className="text-discord-muted hover:text-discord-red transition-colors flex-shrink-0">
              <FiX size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Left toolbar: attach + mic */}
          <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileAttach}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
              title="Attach photo"
            >
              <FiPaperclip size={18} />
            </button>
          </div>

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={newMsg}
              onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
              placeholder={mediaAttachment ? 'Add a caption...' : `Message @${activeConv.username}...`}
              className="discord-input w-full resize-none overflow-hidden pr-10"
              rows={1}
              style={{ minHeight: '42px', maxHeight: '160px', lineHeight: '1.5' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  setNewMsg(prev => prev.slice(0, start) + '\n' + prev.slice(end));
                  setTimeout(() => {
                    const el = e.target;
                    el.selectionStart = el.selectionEnd = start + 1;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                  }, 0);
                }
              }}
            />
            <button
              type="button"
              className="absolute right-2 bottom-2 text-discord-muted hover:text-discord-brand transition-colors p-1"
              onClick={e => { e.stopPropagation(); setShowEmojiPicker(p => !p); }}
            >
              <FiSmile size={18} />
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={emoji => { insertEmoji(emoji); setShowEmojiPicker(false); }}
                onClose={() => setShowEmojiPicker(false)}
                anchor="top"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={(!newMsg.trim() && !mediaAttachment) || sending}
            className="discord-btn p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0 mb-0.5"
          >
            <FiSend size={16} />
          </button>
        </div>
      </form>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-discord-muted gap-3">
      <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center">
        <FiMessageSquare size={28} className="opacity-40" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-discord-text">Your messages</p>
        <p className="text-sm mt-1 opacity-70">Search for someone on the left to start chatting</p>
      </div>
    </div>
  );

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex h-full relative">
        {(!isMobile || !activeConv) && (
          <div className="w-full md:w-72 border-r border-white/6 h-full flex-shrink-0 bg-discord-sidebar">
            {ConvList}
          </div>
        )}
        {(!isMobile || activeConv) && (
          <div className="flex-1 h-full min-w-0 relative">
            {ChatArea}
          </div>
        )}
      </div>

      {/* Message Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-36 backdrop-blur-xl animate-fade-in"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 80),
            left: Math.min(contextMenu.x, window.innerWidth - 160)
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
            onClick={() => copyMessage(contextMenu.msg.text)}
          >
            <FiCopy size={13} /> Copy Text
          </button>
          {activeConv && contextMenu.msg.senderId !== (currentUser?._id || currentUser?.id) && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
              onClick={() => {
                setReportTarget({ type: 'user', id: activeConv.userId || contextMenu.msg.senderId, name: activeConv.name });
                setContextMenu(null);
              }}
            >
              <FiFlag size={13} /> Report User
            </button>
          )}
        </div>
      )}

      {/* Conversation Context Menu */}
      {convMenu && (
        <div
          className="fixed z-50 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-36 backdrop-blur-xl animate-fade-in"
          style={{
            top: Math.min(convMenu.y, window.innerHeight - 80),
            left: Math.min(convMenu.x, window.innerWidth - 160)
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
            onClick={() => { navigate(`/profile/${convMenu.username}`); setConvMenu(null); }}
          >
            View Profile
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-orange-400 hover:bg-orange-400/10 transition-colors"
            onClick={() => {
              setReportTarget({ type: 'user', id: convMenu.userId, name: convMenu.name });
              setConvMenu(null);
            }}
          >
            <FiFlag size={13} /> Report User
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
            onClick={() => {
              setConversations(prev => prev.filter(c => c.username !== convMenu.username));
              if (activeConv?.username === convMenu.username) { setActiveConv(null); navigate('/messages'); }
              setConvMenu(null);
            }}
          >
            <FiTrash2 size={13} /> Remove from list
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

      {/* Copied toast */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${showCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="bg-discord-dark border border-white/10 text-discord-text text-xs px-4 py-2 rounded-full shadow-xl backdrop-blur-xl whitespace-nowrap">
          Copied to clipboard
        </div>
      </div>

      {/* Jitsi Meet Call */}
      {jitsiUrl && <JitsiModal roomUrl={jitsiUrl} onClose={() => setJitsiUrl(null)} />}

      {/* Image Crop Modal */}
      {showCropModal && pendingImageSrc && (
        <ImageCropModal
          src={pendingImageSrc}
          aspectRatio={4 / 3}
          onCrop={(croppedFile, previewUrl) => {
            const reader = new FileReader();
            reader.onload = ev => {
              setMediaAttachment({
                type: 'image',
                dataUrl: ev.target.result,
                filename: pendingImageFile?.name || 'image.jpg',
                mimeType: 'image/jpeg',
                size: croppedFile.size,
              });
            };
            reader.readAsDataURL(croppedFile);
            setShowCropModal(false);
            setPendingImageSrc(null);
            setPendingImageFile(null);
          }}
          onCancel={() => {
            setShowCropModal(false);
            setPendingImageSrc(null);
            setPendingImageFile(null);
          }}
        />
      )}

      {/* Image Fullscreen */}
      {fullscreenImg && <ImageFullscreenModal src={fullscreenImg} onClose={() => setFullscreenImg(null)} />}
    </Layout>
  );
}
