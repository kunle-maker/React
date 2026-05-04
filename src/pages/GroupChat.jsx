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

function TwemojiEmoji({ emoji, size = 18 }) {
  try {
    const cp = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(x => x !== 'fe0f').join('-');
    return <img src={`https://twemoji.maxcdn.com/v/latest/svg/${cp}.svg`} alt={emoji} width={size} height={size} className="inline-block select-none object-contain align-middle" />;
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
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const swipeTouchRef = useRef({ x: 0, y: 0, msgId: null, direction: null });
  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;
  const isChannel = group?.isChannel === true;
  const canPost = !isChannel || isAdmin;

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
        if (isAtBottom) scrollToBottom();
        else setNewMsgCount(c => c + 1);
      }
    };
    window.addEventListener('newGroupMessage', handler);
    return () => window.removeEventListener('newGroupMessage', handler);
  }, [groupId, isAtBottom]);

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
      const prevSenderId = prev ? (prev.senderId?._id || prev.senderId) : null;
      const thisSenderId = msg.senderId?._id || msg.senderId;
      const prevDate = prev?.createdAt ? new Date(prev.createdAt) : null;
      const thisDate = msg.createdAt ? new Date(msg.createdAt) : null;
      const timeDiff = prevDate && thisDate ? (thisDate - prevDate) / 60000 : 99;
      const sameGroup = prevSenderId === thisSenderId && timeDiff < 7 && msgDate === lastDate;
      result.push({ type: 'message', msg, isFirstInGroup: !sameGroup, key: msg._id || i });
    });
    return result;
  };

  const items = groupedMessages();

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts} contentClass="overflow-hidden">
      <div className="flex flex-col h-full relative bg-discord-bg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-discord-hover/50 bg-discord-bg/80 backdrop-blur-xl z-20 flex-shrink-0">
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
            const { msg, isFirstInGroup } = item;

            if (msg.type === 'system') {
              return (
                <div key={item.key} className="flex items-center gap-4 px-2 py-1 my-1">
                   <div className="w-10 flex-shrink-0 flex justify-center">
                     <div className="w-0.5 h-full bg-discord-hover/30" />
                   </div>
                   <span className="text-[13px] text-discord-muted font-medium italic">
                     {msg.text}
                   </span>
                </div>
              );
            }

            const mine = isSentByMe(msg);
            const sender = msg.senderId || { username: msg.senderUsername, name: msg.senderUsername };
            const msgKey = msg._id;
            const isSwiping = swipingMsgId === msgKey;

            return (
              <div
                key={item.key}
                className={`group flex items-start gap-4 px-2 py-0.5 hover:bg-white/[0.02] transition-colors relative ${isFirstInGroup ? 'mt-4' : 'mt-[-2px]'}`}
                onContextMenu={e => handleMessageContextMenu(e, msg)}
                onTouchStart={e => handleMsgTouchStart(e, msgKey)}
                onTouchMove={e => handleMsgTouchMove(e, msgKey)}
                onTouchEnd={() => handleMsgTouchEnd(msg)}
                style={isSwiping ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transition: 'transform 0.2s ease' }}
              >
                {!isFirstInGroup ? (
                   <div className="w-10 flex-shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] text-discord-muted mt-1.5 select-none font-medium">
                       {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                     </span>
                   </div>
                ) : (
                  <div className="flex-shrink-0 mt-1 cursor-pointer" onClick={() => navigate(`/profile/${sender.username}`)}>
                    <Avatar user={sender} size={40} supaRing={sender.isSupa} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {isFirstInGroup && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[15px] font-bold cursor-pointer hover:underline ${sender.isSupa ? 'supa-chat-name' : 'text-discord-text'}`}
                        style={sender.isSupa ? {} : { color: stringToColor(sender.username || '') }}
                        onClick={() => navigate(`/profile/${sender.username}`)}
                      >
                        {sender.name || sender.username}
                      </span>
                      {sender.isVerified && <VerifiedBadge size={14} />}
                      <span className="text-[11px] text-discord-muted font-medium">
                        {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                      </span>
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
                        {(() => {
                          const text = msg.text || '';
                          const replyMatch = text.match(/^↩ (@[^\n]+)\n([\s\S]*)$/);
                          if (replyMatch) {
                            return (
                              <div className="mb-1">
                                <div className="flex items-center gap-2 text-xs text-discord-muted mb-0.5 opacity-80 hover:opacity-100 cursor-pointer">
                                   <div className="w-4 h-4 rounded-full bg-discord-hover flex items-center justify-center"><FiArrowLeft size={10} className="rotate-180" /></div>
                                   <span className="font-bold">{replyMatch[1]}</span>
                                </div>
                                <FormattedText text={replyMatch[2].trim()} />
                              </div>
                            );
                          }
                          const imgMatch = text.match(/^\[vx:img:([^\]]+)\](.*)$/s);
                          const callMatch = text.match(/^\[vx:call:([^\]]+)\](.*)$/s);
                          if (imgMatch) {
                            return (
                              <div>
                                <img
                                  src={imgMatch[1]}
                                  alt="Image"
                                  className="rounded-xl max-w-full md:max-w-[400px] max-h-[500px] object-cover cursor-pointer hover:brightness-90 transition-all mt-1 shadow-sm"
                                  onClick={() => setFullscreenImg(imgMatch[1])}
                                  loading="lazy"
                                />
                                {imgMatch[2]?.trim() && <div className="mt-2"><FormattedText text={imgMatch[2].trim()} /></div>}
                              </div>
                            );
                          }
                          if (callMatch) {
                             return (
                               <div className="flex flex-col gap-3 mt-2 max-w-sm bg-discord-hover/30 border border-discord-hover/50 rounded-2xl p-4">
                                 <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-full bg-discord-green/20 flex items-center justify-center text-discord-green"><FiVideo size={20} /></div>
                                   <div>
                                     <p className="text-sm font-bold text-discord-text">Video Call Started</p>
                                     <p className="text-xs text-discord-muted">Join the ongoing conversation</p>
                                   </div>
                                 </div>
                                 <a
                                   href={callMatch[1]}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center justify-center gap-2 bg-discord-green hover:bg-discord-green-dark text-white py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-discord-green/20"
                                   onClick={e => e.stopPropagation()}
                                 >
                                   Join Call
                                 </a>
                               </div>
                             );
                          }
                          return <FormattedText text={text} />;
                        })()}
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
                          <button key={emoji} onClick={() => handleReactGroup(msg, emoji)} className={`flex items-center text-xs rounded-full px-2 py-0.5 border transition-all active:scale-95 ${mine ? 'bg-discord-brand/20 border-discord-brand/40 text-discord-brand' : 'bg-white/5 border-white/10 text-discord-text hover:border-white/20'}`}>
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
                        <button key={emoji} onClick={() => handleReactGroup(msg, emoji)} className="hover:scale-125 transition-transform active:scale-110 p-0.5 flex items-center justify-center"><TwemojiEmoji emoji={emoji} size={20} /></button>
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
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-4 px-2 py-2">
              <div className="w-10 flex-shrink-0" />
              <div className="flex items-center gap-2 text-discord-muted text-xs font-bold italic">
                <div className="typing-indicator flex gap-1"><span className="w-1 h-1"/><span className="w-1 h-1"/><span className="w-1 h-1"/></div>
                <span>{typingUsers.slice(0, 2).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
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
          <div className={`flex flex-col flex-shrink-0 bg-discord-bg transition-all duration-300 ${showEmojiPicker ? 'pb-0' : 'pb-safe'}`}>
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

              <div className="flex items-end gap-3 bg-discord-hover/50 rounded-2xl px-4 py-2.5 min-h-[48px] border border-transparent focus-within:border-discord-brand/20 transition-all">
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
