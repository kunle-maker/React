import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiMessageSquare, FiSearch, FiCheck, FiCheckCircle, FiTrash2, FiCopy, FiX, FiMoreHorizontal, FiFlag, FiSmile, FiPaperclip, FiPhone, FiVideo, FiPlay, FiShare2, FiSave, FiGlobe, FiEdit2, FiMic, FiFile, FiPlusSquare, FiCornerUpLeft } from 'react-icons/fi';
import ImageCropModal from '../components/ImageCropModal';
import ReportModal from '../components/ReportModal';
import TranslateModal from '../components/TranslateModal';
import { formatDistanceToNow, format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import LinkPreview from '../components/LinkPreview';
import EmojiStickerPicker from '../components/EmojiStickerPicker';
import { parseEmojisToHtml } from '../utils/emoji';
import API from '../utils/api';
import socket from '../utils/socket';
import { showToast } from '../utils/toast';
import { playSendPop } from '../utils/soundFx';
import { haptic } from '../utils/haptics';
import TwemojiTextarea from '../components/TwemojiTextarea';

const MSG_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '😡', '🔥', '💯'];

function TwemojiEmoji({ emoji, size = 18 }) {
  try {
    const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
    return <img src={`https://twemoji.maxcdn.com/v/latest/svg/${cp}.svg`} alt={emoji} width={size} height={size} className="inline-block select-none object-contain align-middle" />;
  } catch { return <span>{emoji}</span>; }
}

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
      showToast('Video link copied!');
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
      showToast('Video link copied!');
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

function MessageContent({ msg, onOpenImage }) {
  const text = msg.text || '';

  const replyMatch = !msg.type && text.match(/^↩ (@[^\n]+)\n([\s\S]*)$/);
  if (replyMatch) {
    const restMsg = { ...msg, text: replyMatch[2].trim() };
    return (
      <div>
        <div className="flex items-center gap-1.5 text-xs text-discord-muted mb-1 opacity-80">
          <div className="w-3.5 h-3.5 rounded-full bg-discord-hover flex items-center justify-center flex-shrink-0">
            <FiCornerUpLeft size={9} />
          </div>
          <span className="font-bold truncate">{replyMatch[1]}</span>
        </div>
        <MessageContent msg={restMsg} onOpenImage={onOpenImage} />
      </div>
    );
  }

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-discord-muted bg-white/4 border border-white/8 px-3 py-1 rounded-full italic">{msg.text || msg.formattedText || ''}</span>
      </div>
    );
  }

  if ((msg.type === 'image' || msg.type === 'video' || msg.type === 'audio' || msg.type === 'file') && msg.mediaUrl) {
    if (msg.type === 'video') {
      return (
        <div>
          <VideoMessage src={msg.mediaUrl} />
          {text?.trim() && <div className="mt-1.5 text-sm"><FormattedText text={text.trim()} /></div>}
        </div>
      );
    }
    if (msg.type === 'audio') {
      return (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="text-discord-brand text-xs font-medium">🎵 Audio</span>
          </div>
          <audio controls src={msg.mediaUrl} className="w-full max-w-[240px]" style={{ height: '36px' }} />
          {text?.trim() && <div className="mt-1 text-sm"><FormattedText text={text.trim()} /></div>}
        </div>
      );
    }
    if (msg.type === 'file') {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2.5">
            <span className="text-discord-brand text-lg flex-shrink-0">📎</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-discord-text truncate max-w-[180px]">{msg.fileName || 'File'}</p>
              {msg.fileSize && <p className="text-[11px] text-discord-muted">{(msg.fileSize / 1024).toFixed(1)} KB</p>}
            </div>
            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-discord-brand text-xs ml-auto font-semibold">Open</a>
          </div>
          {text?.trim() && <div className="mt-1 text-sm"><FormattedText text={text.trim()} /></div>}
        </div>
      );
    }
    return (
      <div>
        <img
          src={msg.mediaUrl}
          alt="Image"
          className="rounded-xl max-w-[260px] max-h-[320px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onOpenImage?.(msg.mediaUrl)}
          loading="lazy"
        />
        {text?.trim() && <div className="mt-1.5 text-sm"><FormattedText text={text.trim()} /></div>}
      </div>
    );
  }

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

function getMessagePreview(msgOrText) {
  if (!msgOrText) return '';
  if (typeof msgOrText === 'object') {
    if (msgOrText.type === 'image') return '📷 Photo';
    if (msgOrText.type === 'video') return '📹 Video';
    if (msgOrText.type === 'audio') return '🎵 Audio';
    if (msgOrText.type === 'file') return `📎 ${msgOrText.fileName || 'File'}`;
    return getMessagePreview(msgOrText.text || '');
  }
  const text = msgOrText;
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
  const [translateMsg, setTranslateMsg] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [swipingMsgId, setSwipingMsgId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordIntervalRef = useRef(null);
  const swipeTouchRef = useRef({ x: 0, y: 0, msgId: null, direction: null });
  const isMobile = window.innerWidth < 768;

  const activeConvRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const currentUserRef = useRef(currentUser);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    if (username) openConversation(username);
  }, [username]);

  useEffect(() => {
    const handler = (e) => {
      const { sender, message } = e.detail;
      if (!sender || !message) return;

      const myUsername = currentUserRef.current?.username;
      const conv = activeConvRef.current;

      // Determine the "other party" username — the one who isn't me
      const otherUsername = sender.username === myUsername
        ? message.receiverUsername || message.receiver?.username
        : sender.username;

      if (conv?.username && otherUsername === conv.username) {
        // Message belongs to the active chat — append (deduplicate by _id)
        setMessages(prev => {
          if (prev.some(m => m._id && m._id === message._id)) return prev;
          return [...prev, message];
        });
        if (isAtBottomRef.current) scrollToBottom();
        else setNewMsgCount(c => c + 1);
        if (sender.username !== myUsername) {
          API.markConversationRead(conv.username).catch(() => {});
        }
      } else if (sender.username !== myUsername) {
        // Incoming message from someone other than active conv — update sidebar
        setConversations(prev => {
          const existing = prev.find(c => c.username === sender.username);
          const updated = {
            userId: sender._id,
            username: sender.username,
            name: sender.name,
            profilePicture: sender.profilePicture,
            isOnline: sender.isOnline,
            isSupa: sender.isSupa,
            isVerified: sender.isVerified,
            isBot: sender.isBot || existing?.isBot || false,
            lastMessage: getMessagePreview(message),
            lastMessageTime: message.createdAt,
            unreadCount: (existing?.unreadCount || 0) + 1,
          };
          if (existing) return [updated, ...prev.filter(c => c.username !== sender.username)];
          return [updated, ...prev];
        });
      }
    };
    window.addEventListener('newMessage', handler);
    return () => window.removeEventListener('newMessage', handler);
  }, []);

  // Live online-status updates from followers-only socket events
  useEffect(() => {
    const handler = (e) => {
      const { userId, isOnline, lastSeen } = e.detail || {};
      if (!userId) return;
      // Update the active conversation header dot
      setActiveConv(prev => {
        if (!prev) return prev;
        if (prev.userId === userId || prev._id === userId || prev.id === userId) {
          return { ...prev, isOnline, lastSeen: lastSeen ?? null };
        }
        return prev;
      });
      // Update the sidebar list dot
      setConversations(prev =>
        prev.map(c =>
          c.userId === userId ? { ...c, isOnline, lastSeen: lastSeen ?? null } : c
        )
      );
    };
    window.addEventListener('userStatusUpdate', handler);
    return () => window.removeEventListener('userStatusUpdate', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { userId } = e.detail;
      const conv = activeConvRef.current;
      if (conv && (userId === conv.userId || userId === conv._id || userId === conv.id)) {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
      }
    };
    window.addEventListener('typingIndicator', handler);
    return () => window.removeEventListener('typingIndicator', handler);
  }, []);

  // Listen for read receipts — mark messages as read in the active conversation
  useEffect(() => {
    const handler = (e) => {
      const { senderUsername } = e.detail || {};
      const conv = activeConvRef.current;
      if (conv && senderUsername === conv.username) {
        setMessages(prev => prev.map(m =>
          m.status !== 'read' ? { ...m, status: 'read' } : m
        ));
      }
    };
    window.addEventListener('messagesRead', handler);
    return () => window.removeEventListener('messagesRead', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => { setContextMenu(null); setConvMenu(null); setActiveReactionPicker(null); };
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
    window.addEventListener('messageEdited', onEdited);
    window.addEventListener('messageUnsent', onUnsent);
    return () => {
      window.removeEventListener('messageEdited', onEdited);
      window.removeEventListener('messageUnsent', onUnsent);
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

  const handleReact = async (msg, emoji) => {
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
    try { await API.reactToDM(msg._id, emoji); } catch {}
  };

  const handleEditSave = async (messageId) => {
    if (!editText.trim()) return;
    try {
      const data = await API.editDM(messageId, editText.trim());
      const updated = data.message || data;
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: updated.text || editText.trim(), edited: true } : m));
    } catch {}
    setEditingMsgId(null);
    setEditText('');
  };

  const handleUnsend = async (messageId) => {
    setContextMenu(null);
    try {
      await API.unsendDM(messageId);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, text: '', unsent: true } : m));
    } catch {}
  };

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
          const lm = c.lastMessage;
          const preview = lm
            ? (lm.isDeleted ? 'This message was deleted'
              : lm.type === 'image' ? '📷 Photo'
              : lm.type === 'video' ? '🎥 Video'
              : lm.type === 'audio' ? '🎵 Voice message'
              : lm.type === 'file' ? `📎 ${lm.fileName || 'File'}`
              : getMessagePreview(lm.text || lm))
            : '';
          return {
            userId: c.user._id,
            username: c.user.username,
            name: c.user.name,
            profilePicture: c.user.profilePicture,
            isOnline: c.user.isOnline,
            isSupa: c.user.isSupa,
            isVerified: c.user.isVerified,
            isBot: c.user.isBot || false,
            lastMessage: preview,
            lastMessageTime: lm?.createdAt || null,
            unreadCount: c.unreadCount || 0,
            isMine: lm?.isMine || false,
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
    setBlockedByMe(false);
    API.clearCache(`/api/conversations/${uname}`);
    try {
      const [data, blocked] = await Promise.all([
        API.getConversation(uname),
        API.getBlockedUsers().catch(() => []),
      ]);
      const convInfo = conversations.find(c => c.username === uname);
      const enrichedUser = { ...data.targetUser, isBot: data.targetUser?.isBot || convInfo?.isBot || false };
      setActiveConv(enrichedUser);
      if (!enrichedUser.isBot) {
        API.getUser(uname).then(u => {
          if (u?.isBot) setActiveConv(prev => prev?.username === uname ? { ...prev, isBot: true } : prev);
        }).catch(() => {});
      }
      setMessages(data.messages || []);
      const blockedList = Array.isArray(blocked) ? blocked : [];
      const targetUser = data.targetUser;
      const targetId = targetUser?._id || targetUser?.id;
      const targetUsername = targetUser?.username;
      setBlockedByMe(blockedList.some(u => (u._id || u.id) === targetId || u.username === targetUsername));
      setConversations(prev => prev.map(c => c.username === uname ? { ...c, unreadCount: 0 } : c));
      await API.markConversationRead(uname).catch(() => {});
      // Mark all unread messages from this sender as read (read receipts)
      API.markMessagesRead(uname).catch(() => {});
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
    const MAX = 100 * 1024 * 1024;
    if (file.size > MAX) {
      showToast('File too large. Maximum size is 100 MB.', { type: 'error' });
      return;
    }
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
    } catch { showToast('Microphone access denied', { type: 'error' }); }
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
    if (replyingTo) {
      const rawPreview = (replyingTo.text || '').replace(/^\[vx:[^\]]+\]\n?/, '').trim().slice(0, 60);
      const senderName = isSentByMe(replyingTo) ? currentUser.username : activeConv.username;
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
        const imageUrl = uploadData?.url;
        if (!imageUrl) throw new Error('No URL returned from upload');
        const imgText = `[vx:img:${imageUrl}]${text ? '\n' + text : ''}`;
        const myId = currentUser?._id || currentUser?.id;
        const tempMsg = {
          _id: Date.now(),
          text: imgText,
          senderId: myId,
          createdAt: new Date().toISOString(),
          status: 'sent'
        };
        setMediaAttachment(null);
        setNewMsg('');
        if (textareaRef.current) textareaRef.current.style.height = '42px';
        setMessages(prev => [...prev, tempMsg]);
        playSendPop();
        scrollToBottom();
        setConversations(prev => {
          const existing = prev.find(c => c.username === activeConv.username);
          const updated = { ...(existing || activeConv), lastMessage: '📷 Photo', lastMessageTime: new Date().toISOString(), unreadCount: 0, isMine: true };
          return [updated, ...prev.filter(c => c.username !== activeConv.username)];
        });
        await API.sendMessage({ receiverUsername: activeConv.username, text: imgText });
        setSending(false);
        return;
      } catch {
        setSending(false);
        setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
        showToast('Image upload failed. Please try again.', { type: 'error' });
        return;
      }
    }

    setSending(true);
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }

    if (mediaAttachment && mediaAttachment.type !== 'image') {
      const att = mediaAttachment;
      setMediaAttachment(null);
      const myId2 = currentUser?._id || currentUser?.id;
      try {
        const formData = new FormData();
        if (att.file) {
          formData.append('file', att.file, att.filename);
        } else if (att.dataUrl) {
          const blob = dataURLToBlob(att.dataUrl);
          formData.append('file', blob, att.filename || `${att.type}.webm`);
        } else { throw new Error('No file data'); }
        const uploadData = await API.uploadMessageMedia(formData);
        const msgType = uploadData.messageType || att.type;
        const tempMsg2 = {
          _id: Date.now(), type: msgType, mediaUrl: uploadData.url, mediaType: uploadData.mediaType,
          fileName: uploadData.fileName || att.filename, fileSize: uploadData.fileSize || att.size,
          text: text || '', senderId: myId2, createdAt: new Date().toISOString(), status: 'sent',
        };
        setMessages(prev => [...prev, tempMsg2]);
        playSendPop();
        scrollToBottom();
        const preview2 = msgType === 'video' ? '🎥 Video' : msgType === 'audio' ? '🎵 Voice message' : `📎 ${uploadData.fileName || att.filename}`;
        setConversations(prev => {
          const existing = prev.find(c => c.username === activeConv.username);
          return [{ ...(existing || activeConv), lastMessage: preview2, lastMessageTime: new Date().toISOString(), unreadCount: 0, isMine: true }, ...prev.filter(c => c.username !== activeConv.username)];
        });
        await API.sendMessage({ receiverUsername: activeConv.username, type: msgType, mediaUrl: uploadData.url, mediaType: uploadData.mediaType, mediaPublicId: uploadData.publicId, fileName: uploadData.fileName || att.filename, fileSize: uploadData.fileSize || att.size, text: text || '' });
      } catch {
        if (att.type === 'audio' && att.dataUrl) {
          const fallbackText = `[vx:audio:${att.dataUrl}]${text ? '\n' + text : ''}`;
          const tempMsg2 = { _id: Date.now(), text: fallbackText, senderId: myId2, createdAt: new Date().toISOString(), status: 'sent' };
          setMessages(prev => [...prev, tempMsg2]);
          playSendPop();
          scrollToBottom();
          try { await API.sendMessage({ receiverUsername: activeConv.username, text: fallbackText }); } catch {}
        } else {
          showToast('Upload failed. Please try again.', { type: 'error' });
        }
      } finally { setSending(false); }
      return;
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
    playSendPop();
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
      e.preventDefault();
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

  const sendStartCommand = async () => {
    const text = '/start';
    const myId = currentUser?._id || currentUser?.id;
    const tempMsg = { _id: Date.now(), text, senderId: myId, createdAt: new Date().toISOString(), status: 'sent' };
    setMessages(prev => [...prev, tempMsg]);
    playSendPop();
    scrollToBottom();
    setConversations(prev => {
      const existing = prev.find(c => c.username === activeConv.username);
      const updated = { ...(existing || activeConv), lastMessage: text, lastMessageTime: new Date().toISOString(), unreadCount: 0, isMine: true };
      return [updated, ...prev.filter(c => c.username !== activeConv.username)];
    });
    try { await API.sendMessage({ receiverUsername: activeConv.username, text }); } catch {}
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

  const handleEmojiButtonClick = () => {
    setShowEmojiPicker(prev => !prev);
  };

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
                onClick={() => { setSearchQ(''); setSearchUsers([]); navigate(`/messages/chat/${u.username}`); }}
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
                onClick={() => navigate(`/messages/chat/${c.username}`)}
                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setConvMenu({ username: c.username, x: e.clientX, y: e.clientY }); }}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={c} size={40} showStatus={!c.isSupa} supaRing={true} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-1">
                    <span className={`font-semibold text-sm truncate flex items-center gap-1 ${c.isSupa ? 'supa-chat-name' : 'text-discord-text'}`}>
                      {c.name || c.username}
                      {c.isBot && <span className="text-[9px] font-bold text-discord-brand bg-discord-brand/10 border border-discord-brand/20 px-1 py-0.5 rounded leading-none flex-shrink-0">BOT</span>}
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
    <div className="flex flex-col h-full relative bg-discord-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-discord-hover/50 bg-discord-bg/80 backdrop-blur-xl z-20 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <button className="text-discord-muted hover:text-discord-text transition-colors -ml-1 p-1" onClick={() => { setActiveConv(null); navigate('/messages'); }}>
              <FiArrowLeft size={22} />
            </button>
          )}
          <div
            className="cursor-pointer flex items-center gap-2.5 min-w-0 group"
            onClick={() => navigate(`/profile/${activeConv.username}`)}
          >
            <div className="relative flex-shrink-0">
              <Avatar user={activeConv} size={34} showStatus={!activeConv.isSupa} supaRing={true} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[15px] font-bold truncate ${activeConv.isSupa ? 'supa-chat-name' : 'text-discord-text'}`}>
                  {activeConv.name}
                </span>
                {activeConv.isVerified && <FiCheckCircle size={12} className="text-discord-brand flex-shrink-0" />}
                {activeConv.isBot && <span className="text-[10px] font-bold text-discord-brand bg-discord-brand/10 border border-discord-brand/20 px-1.5 py-0.5 rounded-md leading-none">⚙️ BOT</span>}
              </div>
              <p className="text-[11px] font-medium leading-none text-discord-muted mt-0.5">
                {activeConv.isBot ? (
                  <span className="text-discord-brand/70">Bot</span>
                ) : activeConv.isOnline ? (
                  <span className="flex items-center gap-1 text-discord-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-discord-green" /> Online
                  </span>
                ) : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!activeConv.isBot && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth no-scrollbar"
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
          activeConv.isBot ? (
            <div className="flex flex-col items-center justify-center h-full px-6 gap-5">
              <Avatar user={activeConv} size={88} supaRing />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-discord-text">{activeConv.name}</h2>
                <p className="text-[13px] text-discord-brand font-semibold mt-1">⚙️ Bot</p>
                {activeConv.shortDescription && (
                  <p className="text-discord-muted text-sm mt-2 max-w-xs leading-relaxed">{activeConv.shortDescription}</p>
                )}
                {!activeConv.shortDescription && activeConv.bio && (
                  <p className="text-discord-muted text-sm mt-2 max-w-xs leading-relaxed">{activeConv.bio}</p>
                )}
              </div>
              <button
                className="px-10 py-3 bg-discord-brand hover:bg-discord-brand/90 text-white rounded-2xl font-bold text-[15px] transition-all active:scale-95 shadow-lg shadow-discord-brand/20"
                onClick={sendStartCommand}
              >
                Start
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-end h-full px-2 pb-8">
              <div className="w-20 h-20 rounded-full bg-discord-brand/10 flex items-center justify-center mb-4">
                <Avatar user={activeConv} size={80} supaRing />
              </div>
              <h2 className="text-3xl font-bold text-discord-text mb-2">Welcome to the beginning of your direct message history with @{activeConv.username}</h2>
              <p className="text-discord-muted mb-6">This is the start of your direct message history with {activeConv.name}.</p>
              <div className="h-px w-full bg-discord-hover/50 mb-4" />
            </div>
          )
        ) : items.map(item => {
          if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
          const { msg, mine, grouped } = item;

          return (
            <div
              key={item.key}
              className={`group flex items-start gap-4 px-2 py-1 hover:bg-white/[0.02] transition-colors relative ${grouped ? 'mt-[-4px]' : 'mt-4'}`}
              onContextMenu={e => handleMessageContextMenu(e, msg)}
              onTouchStart={e => handleMsgTouchStart(e, item.key)}
              onTouchMove={e => handleMsgTouchMove(e, item.key)}
              onTouchEnd={() => handleMsgTouchEnd(msg)}
              style={swipingMsgId === item.key
                ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
                : { transition: 'transform 0.2s ease' }}
            >
              {!grouped ? (
                <div className="flex-shrink-0 mt-1 cursor-pointer" onClick={() => navigate(`/profile/${mine ? currentUser.username : activeConv.username}`)}>
                  <Avatar user={mine ? currentUser : activeConv} size={40} />
                </div>
              ) : (
                <div className="w-10 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-discord-muted mt-1.5 select-none font-medium">
                    {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                  </span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!grouped && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span 
                      className={`text-[15px] font-bold cursor-pointer hover:underline ${(mine ? (currentUser.isSupa ? 'supa-chat-name' : 'text-discord-text') : (activeConv.isSupa ? 'supa-chat-name' : 'text-discord-text'))}`}
                      onClick={() => navigate(`/profile/${mine ? currentUser.username : activeConv.username}`)}
                    >
                      {mine ? currentUser.name : activeConv.name}
                    </span>
                    <span className="text-[11px] text-discord-muted font-medium">
                      {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                    </span>
                    {mine && !msg.unsent && (
                      <span className="text-[11px]" title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                        {msg.status === 'read'
                          ? <span className="text-discord-brand font-bold">✓✓</span>
                          : msg.status === 'delivered'
                          ? <span className="text-discord-muted">✓✓</span>
                          : <span className="text-discord-muted">✓</span>}
                      </span>
                    )}
                  </div>
                )}

                <div className={`text-[15px] leading-relaxed break-words text-[#dbdee1] ${msg.unsent ? 'italic text-discord-muted opacity-60' : ''}`}>
                  {msg.unsent ? (
                    <span>This message was unsent</span>
                  ) : editingMsgId === msg._id ? (
                    <div className="mt-1 bg-discord-hover/30 rounded-lg p-2 border border-discord-brand/30">
                      <textarea
                        className="w-full bg-transparent text-sm resize-none outline-none text-discord-text"
                        rows={2}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) { e.preventDefault(); handleEditSave(msg._id); }
                          if (e.key === 'Escape') { setEditingMsgId(null); setEditText(''); }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => { setEditingMsgId(null); setEditText(''); }} className="text-xs text-discord-text hover:underline">Cancel</button>
                        <button onClick={() => handleEditSave(msg._id)} className="text-xs bg-discord-brand text-white px-3 py-1 rounded-md font-medium">Save Changes</button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group/content">
                      <MessageContent msg={msg} onOpenImage={setFullscreenImg} />
                      {msg.edited && !msg.unsent && <span className="text-[10px] text-discord-muted ml-1 select-none">(edited)</span>}
                    </div>
                  )}
                </div>
                {/* Reaction bubbles */}
                {msg.reactions?.length > 0 && !msg.unsent && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => {
                      const myId = currentUser?._id || currentUser?.id;
                      const mine = msg.reactions.some(r => (r.userId === myId || r.userId?._id === myId) && r.emoji === emoji);
                      return (
                        <button key={emoji} onClick={() => handleReact(msg, emoji)} className={`flex items-center text-xs rounded-full px-2 py-0.5 border transition-all active:scale-95 ${mine ? 'bg-discord-brand/20 border-discord-brand/40 text-discord-brand' : 'bg-white/5 border-white/10 text-discord-text hover:border-white/20'}`}>
                          <TwemojiEmoji emoji={emoji} size={14} /><span className="font-bold ml-0.5">{count}</span>
                        </button>
                      );
                    })}
                    <button onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(activeReactionPicker === msg._id ? null : msg._id); }} className="flex items-center text-discord-muted hover:text-discord-text text-xs rounded-full px-1.5 py-0.5 border border-transparent hover:border-white/10 hover:bg-white/5 transition-all">
                      <FiSmile size={12} />
                    </button>
                  </div>
                )}
                {/* Reaction picker popup */}
                {activeReactionPicker === msg._id && (
                  <div className="flex items-center gap-1 bg-discord-dark border border-white/10 rounded-full px-2 py-1.5 shadow-2xl mt-1 w-fit animate-fade-in" onClick={e => e.stopPropagation()}>
                    {MSG_REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => handleReact(msg, emoji)} className="hover:scale-125 transition-transform active:scale-110 p-0.5 flex items-center justify-center"><TwemojiEmoji emoji={emoji} size={20} /></button>
                    ))}
                  </div>
                )}
                {!msg.unsent && msg.text && !msg.text.startsWith('[vx:') && <LinkPreview text={msg.text} />}
              </div>
              {/* Reaction trigger on hover */}
              {!msg.unsent && (
                <button
                  className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity bg-discord-dark border border-white/10 rounded-full p-1.5 text-discord-muted hover:text-discord-text hover:bg-discord-hover shadow-sm z-10"
                  onClick={(e) => { e.stopPropagation(); setActiveReactionPicker(activeReactionPicker === msg._id ? null : msg._id); }}
                >
                  <FiSmile size={14} />
                </button>
              )}
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-4 px-2 py-2">
            <div className="w-10 flex-shrink-0" />
            <div className="flex items-center gap-2 text-discord-muted text-xs font-bold italic">
              <div className="typing-indicator flex gap-1"><span className="w-1 h-1"/><span className="w-1 h-1"/><span className="w-1 h-1"/></div>
              <span>{activeConv.name} is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Jump to bottom */}
      {!isAtBottom && (
        <button
          className="absolute bottom-24 right-6 bg-discord-brand text-white w-10 h-10 rounded-full flex items-center justify-center shadow-xl z-30 animate-bounce"
          onClick={() => scrollToBottom()}
        >
          {newMsgCount > 0 ? (
            <span className="text-[11px] font-bold">{newMsgCount > 9 ? '9+' : newMsgCount}</span>
          ) : (
            <FiArrowLeft className="rotate-[-90deg]" size={18} />
          )}
        </button>
      )}

      {/* Input */}
      <div className={`flex flex-col flex-shrink-0 bg-discord-bg transition-all duration-300 ${showEmojiPicker ? 'pb-0' : 'pb-safe'}`}>
        {blockedByMe ? (
          <div className="px-4 py-4 border-t border-discord-hover/50 flex flex-col items-center gap-2">
            <p className="text-discord-muted text-sm text-center">You blocked <span className="font-bold text-discord-text">@{activeConv?.username}</span>. You can't send messages.</p>
            <button onClick={async () => { try { await API.unblockUser(activeConv.username); setBlockedByMe(false); } catch {} }} className="text-discord-brand text-xs font-bold hover:underline">Unblock User</button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="px-4 py-3">
            {/* Reply Preview */}
            {replyingTo && (
              <div className="mb-3 p-3 bg-discord-hover/30 rounded-xl border border-discord-hover/50 flex items-center gap-3 animate-fade-in">
                <div className="w-1 h-8 bg-discord-brand rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-discord-brand mb-0.5 flex items-center gap-1">
                    <FiCornerUpLeft size={11} /> Replying to @{isSentByMe(replyingTo) ? currentUser.username : activeConv.username}
                  </p>
                  <p className="text-xs text-discord-muted truncate">
                    {(replyingTo.text || '').replace(/^\[vx:[^\]]+\]\n?/, '').trim() || '📷 Photo'}
                  </p>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} className="p-1.5 text-discord-muted hover:text-discord-red flex-shrink-0">
                  <FiX size={16} />
                </button>
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

            <div className="flex items-end gap-3 bg-discord-hover/50 rounded-2xl px-4 py-2.5 min-h-[48px] border border-transparent focus-within:border-discord-brand/20 transition-all">
              <button
                type="button"
                className="p-1 text-discord-muted hover:text-discord-text transition-colors mb-0.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiPlusSquare size={22} className="fill-discord-muted/10" />
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,application/gzip" />
              </button>

              <TwemojiTextarea
                ref={textareaRef}
                value={newMsg}
                onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                onFocus={() => setShowEmojiPicker(false)}
                placeholder={`Message @${activeConv.username}`}
                wrapperClassName="flex-1 min-w-0"
                className="w-full bg-transparent text-[15px] text-discord-text outline-none resize-none py-1 max-h-40 no-scrollbar"
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
                {newMsg.trim() || mediaAttachment ? (
                  <button type="submit" className="p-1 text-discord-brand hover:text-discord-brand-light transition-all active:scale-90">
                    <FiSend size={22} />
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        )}

        {/* Improved Emoji Picker as Keyboard */}
        {showEmojiPicker && (
          <div className="w-full bg-discord-bg animate-slide-up border-t border-discord-hover/50" style={{ height: '320px' }}>
            <EmojiStickerPicker
              onSelectEmoji={insertEmoji}
              onSelectSticker={async (sticker) => {
                setShowEmojiPicker(false);
                const stickerText = `[vx:img:${sticker.url}]`;
                const tempMsg = { _id: Date.now(), text: stickerText, senderId: currentUser?._id || currentUser?.id, createdAt: new Date().toISOString(), status: 'sent' };
                setMessages(prev => [...prev, tempMsg]);
                scrollToBottom();
                try { await API.sendMessage({ receiverUsername: activeConv.username, text: stickerText }); } catch {}
              }}
              onClose={() => setShowEmojiPicker(false)}
              anchor="keyboard"
            />
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-discord-muted gap-3 bg-discord-bg">
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
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-hidden">
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
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 180)
          }}
          onClick={e => e.stopPropagation()}
        >
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
          {!contextMenu.msg.unsent && isSentByMe(contextMenu.msg) && !contextMenu.msg.text?.startsWith('[vx:') && (
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
          {!contextMenu.msg.unsent && isSentByMe(contextMenu.msg) && (
            <button
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
              onClick={() => handleUnsend(contextMenu.msg._id)}
            >
              <FiTrash2 size={13} /> Unsend
            </button>
          )}
          {activeConv && !isSentByMe(contextMenu.msg) && (
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
                filename: pendingImageFile?.name || prev?.filename || 'image.jpg',
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
      {fullscreenImg && <ImageFullscreenModal src={fullscreenImg} onClose={() => setFullscreenImg(null)} />}
    </Layout>
  );
}
