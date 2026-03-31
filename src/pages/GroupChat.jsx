import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiUsers, FiInfo, FiTrash2, FiCopy, FiMoreVertical, FiLogOut, FiFlag, FiSmile, FiPaperclip, FiPhone, FiVideo, FiX, FiMoreHorizontal, FiSave, FiGlobe, FiEdit2 } from 'react-icons/fi';
import ImageCropModal from '../components/ImageCropModal';
import ReportModal from '../components/ReportModal';
import TranslateModal from '../components/TranslateModal';
import { format, isToday, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import LinkPreview from '../components/LinkPreview';
import EmojiPicker from '../components/EmojiPicker';
import { AnimatedBadge, VerifiedBadge, SupaBadge } from '../components/UserBadge';
import { getBadgeById } from '../data/badges';
import API from '../utils/api';
import socket from '../utils/socket';

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
    const handleClickOutside = () => { setContextMenu(null); setShowMenu(false); };
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
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      setPendingImageFile(file);
      setMediaAttachment({
        type: 'image',
        dataUrl: compressed,
        filename: file.name || 'image.jpg',
        mimeType: 'image/jpeg',
        size: file.size,
      });
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
        formData.append('image', blob, mediaAttachment.filename || 'image.jpg');
        const uploadData = await API.uploadMessageMedia(formData);
        const imageUrl =
          uploadData?.url || uploadData?.imageUrl || uploadData?.secure_url ||
          uploadData?.mediaUrl || uploadData?.fileUrl || uploadData?.link ||
          uploadData?.data?.url || uploadData?.data?.secure_url ||
          (typeof uploadData === 'string' ? uploadData : null);
        if (!imageUrl) throw new Error('No URL returned from upload');
        text = `[vx:img:${imageUrl}]${text ? '\n' + text : ''}`;
        setMediaAttachment(null);
      } catch (err) {
        setSending(false);
        alert('Image upload failed. Please try again.');
        return;
      }
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
    } catch (err) { alert(err.message); }
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
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6 flex-shrink-0 backdrop-blur-xl bg-discord-bg/80">
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => navigate('/groups')}>
            <FiArrowLeft size={20} />
          </button>
          <div
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/groups/${groupId}/info`)}
          >
            {group?.profilePicture ? (
              <img src={API.getAvatarUrl(group.profilePicture, 80)} alt={group.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-md" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-discord-brand flex items-center justify-center flex-shrink-0 shadow-md">
                <FiUsers size={16} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-discord-text text-sm truncate">{group?.name}</p>
                {isChannel && <span className="text-[10px] font-bold text-discord-brand bg-discord-brand/15 px-1.5 py-0.5 rounded-full border border-discord-brand/30 flex-shrink-0">📢 Channel</span>}
              </div>
              <p className="text-discord-muted text-xs">{group?.members?.length || 0} {isChannel ? 'subscribers' : 'members'}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              className="p-2 rounded-lg text-discord-muted hover:text-discord-green hover:bg-discord-green/10 transition-colors"
              onClick={() => sendCallInvite(false)}
              title="Voice call"
            >
              <FiPhone size={18} />
            </button>
            <button
              className="p-2 rounded-lg text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
              onClick={() => sendCallInvite(true)}
              title="Video call"
            >
              <FiVideo size={18} />
            </button>
            <button
              className="p-2 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => navigate(`/groups/${groupId}/members`)}
              title="Members"
            >
              <FiUsers size={18} />
            </button>
            <button
              className="p-2 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
              onClick={() => navigate(`/groups/${groupId}/info`)}
              title="Group info"
            >
              <FiInfo size={18} />
            </button>
            {/* More options (leave for non-admins) */}
            <div className="relative">
              <button
                className="p-2 rounded-lg text-discord-muted hover:text-discord-text hover:bg-white/5 transition-colors"
                onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                title="More options"
              >
                <FiMoreVertical size={18} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full mt-1 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-40 z-50 backdrop-blur-xl"
                  onClick={e => e.stopPropagation()}
                >
                  {!isAdmin && (
                    <button
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-discord-red hover:bg-discord-red/10 transition-colors"
                      onClick={() => { setShowMenu(false); handleLeave(); }}
                    >
                      <FiLogOut size={14} /> Leave Group
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-discord-muted hover:bg-white/5 transition-colors"
                      onClick={() => { setShowMenu(false); navigate(`/groups/${groupId}/info`); }}
                    >
                      <FiInfo size={14} /> Group Settings
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
          className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-discord-muted">
              <div className="w-16 h-16 rounded-2xl bg-discord-brand/15 flex items-center justify-center mb-4">
                <FiUsers size={28} className="text-discord-brand" />
              </div>
              <p className="font-semibold text-discord-text mb-1">{group?.name}</p>
              <p className="text-sm text-center px-8">This is the beginning of the group. Say hello!</p>
            </div>
          ) : items.map(item => {
            if (item.type === 'date') return <DateSeparator key={item.key} date={item.date} />;
            const { msg, isFirstInGroup } = item;

            if (msg.type === 'system') {
              return (
                <div key={item.key} className="flex justify-center items-center my-2 px-4">
                  <span className="text-[11px] text-discord-muted bg-white/5 border border-white/8 rounded-full px-3 py-1 text-center max-w-[80%] leading-snug">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const mine = isSentByMe(msg);
            const sender = msg.senderId || { username: msg.senderUsername };
            const msgKey = msg._id;
            const isSwiping = swipingMsgId === msgKey;
            return (
              <div
                key={item.key}
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} group relative`}
                onContextMenu={e => handleMessageContextMenu(e, msg)}
                onTouchStart={e => handleMsgTouchStart(e, msgKey)}
                onTouchMove={e => handleMsgTouchMove(e, msgKey)}
                onTouchEnd={() => handleMsgTouchEnd(msg)}
                style={isSwiping ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : { transition: 'transform 0.2s ease' }}
              >
                {isSwiping && swipeOffset > 20 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-discord-brand opacity-80 pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
                  </div>
                )}
                {!mine && (
                  <div className="w-8 flex-shrink-0 self-end">
                    {isFirstInGroup ? (
                      <div onClick={() => navigate(`/profile/${sender.username}`)} className="cursor-pointer">
                        <Avatar user={sender} size={32} supaRing={true} />
                      </div>
                    ) : (
                      <span className="text-discord-muted text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                        {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                      </span>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && isFirstInGroup && (
                    <span className="flex items-center gap-1 mb-1 flex-wrap">
                      <span
                        className={`text-xs font-semibold cursor-pointer hover:underline ${sender.isSupa ? 'supa-chat-name' : ''}`}
                        style={sender.isSupa ? {} : { color: stringToColor(sender.username || '') }}
                        onClick={() => navigate(`/profile/${sender.username}`)}
                      >
                        {sender.name || sender.username}
                      </span>
                      {sender.isVerified && <VerifiedBadge size={12} />}
                      {sender.isSupa && <SupaBadge size={12} username={sender.username} />}
                      {sender.badge && getBadgeById(sender.badge) && <AnimatedBadge badgeId={sender.badge} size={13} />}
                    </span>
                  )}
                  <div
                    className={`text-sm break-words shadow-sm transition-all duration-150
                      ${msg.unsent ? 'px-3 py-2 bg-white/4 border border-white/8 text-discord-muted italic rounded-2xl' :
                        (msg.text || '').startsWith('[vx:img:') || (msg.text || '').startsWith('[vx:call:')
                          ? 'bg-transparent p-0 border-0'
                          : `px-3 py-2 ${mine
                            ? 'bg-discord-brand text-white rounded-2xl rounded-br-sm'
                            : 'bg-white/6 border border-white/5 text-discord-text rounded-2xl rounded-bl-sm'}
                            ${isFirstInGroup ? '' : mine ? 'rounded-tr-lg' : 'rounded-tl-lg'}`}
                    `}
                  >
                    {msg.unsent ? (
                      <span>This message was unsent</span>
                    ) : editingMsgId === msg._id ? (
                      <div className="flex flex-col gap-1.5 min-w-[180px]">
                        <textarea
                          className="discord-input text-sm resize-none w-full"
                          rows={2}
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(msg._id); }
                            if (e.key === 'Escape') { setEditingMsgId(null); setEditText(''); }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button type="button" onClick={() => { setEditingMsgId(null); setEditText(''); }} className="text-[11px] text-discord-muted hover:text-discord-text px-2 py-0.5 rounded">Cancel</button>
                          <button type="button" onClick={() => handleEditSave(msg._id)} className="text-[11px] bg-discord-brand text-white px-2 py-0.5 rounded hover:bg-discord-brand/80">Save</button>
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const text = msg.text || '';
                        const replyMatch = text.match(/^↩ (@[^\n]+)\n([\s\S]*)$/);
                        if (replyMatch) {
                          return (
                            <div>
                              <div className={`text-xs px-2 py-1 rounded mb-1.5 border-l-2 ${mine ? 'border-white/50 bg-white/10 text-white/70' : 'border-discord-brand bg-discord-brand/10 text-discord-muted'}`}>
                                {replyMatch[1]}
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
                                className="rounded-xl max-w-[240px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setFullscreenImg(imgMatch[1])}
                                loading="lazy"
                              />
                              {imgMatch[2]?.trim() && <div className="mt-1.5 text-sm text-discord-text"><FormattedText text={imgMatch[2].trim()} /></div>}
                            </div>
                          );
                        }
                        if (callMatch) {
                          return (
                            <div className="flex flex-col gap-2 min-w-[180px] bg-white/6 border border-white/10 rounded-2xl px-3 py-2">
                              <div className="flex items-center gap-2">
                                <FiVideo size={14} className="text-discord-green flex-shrink-0" />
                                <span className="text-xs font-semibold text-discord-green">Video Call</span>
                              </div>
                              <a
                                href={callMatch[1]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-discord-brand/90 hover:bg-discord-brand text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <FiVideo size={14} /> Join Call
                              </a>
                            </div>
                          );
                        }
                        return <FormattedText text={text} />;
                      })()
                    )}
                  </div>
                  {!msg.unsent && msg.text && !msg.text.startsWith('[vx:') && <LinkPreview text={msg.text} />}
                  {isFirstInGroup && (
                    <span className="text-discord-muted text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                      {msg.edited && !msg.unsent && <span className="ml-1 opacity-60">(edited)</span>}
                    </span>
                  )}
                </div>
                {mine && (
                  <span className="text-discord-muted text-[10px] mb-1 opacity-0 group-hover:opacity-100 transition-opacity self-end">
                    {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
                  </span>
                )}
              </div>
            );
          })}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-discord-muted text-xs mt-2 px-1">
              <div className="typing-indicator"><span/><span/><span/></div>
              <span>{typingUsers.slice(0, 2).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Jump to bottom */}
        {!isAtBottom && newMsgCount > 0 && (
          <button
            className="absolute bottom-28 left-1/2 -translate-x-1/2 discord-btn text-sm px-4 py-1.5 rounded-full shadow-xl animate-slide-up flex items-center gap-2"
            onClick={() => scrollToBottom()}
          >
            ↓ {newMsgCount} new {newMsgCount === 1 ? 'message' : 'messages'}
          </button>
        )}

        {/* Channel read-only notice */}
        {isChannel && !canPost && (
          <div className="px-4 py-3 border-t border-white/6 flex-shrink-0 bg-discord-sidebar/50">
            <div className="flex items-center justify-center gap-2 text-discord-muted text-sm">
              <span className="text-lg">📢</span>
              <span>This is a broadcast channel. Only the owner can post.</span>
            </div>
          </div>
        )}

        {/* Input */}
        {canPost && <form onSubmit={handleSend} className="px-4 pt-3 pb-20 md:pb-3 border-t border-white/6 flex-shrink-0 relative">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 bg-discord-brand/10 border border-discord-brand/30 rounded-xl px-3 py-2">
              <div className="w-0.5 h-full bg-discord-brand rounded-full self-stretch flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-discord-brand text-[11px] font-semibold mb-0.5">
                  Replying to @{replyingTo.senderId?.username || replyingTo.senderUsername || 'someone'}
                </p>
                <p className="text-discord-muted text-xs truncate">
                  {(replyingTo.text || '').replace(/^\[vx:[^\]]+\]\n?/, '').trim().slice(0, 80) || '📷 Photo'}
                </p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className="text-discord-muted hover:text-discord-red transition-colors flex-shrink-0">
                <FiX size={14} />
              </button>
            </div>
          )}
          {/* Mention Dropdown */}
          {mentionQuery !== null && mentionMembers.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-1 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-xl max-h-52 overflow-y-auto">
              {mentionMembers.map((m) => {
                const username = m.username || m.user?.username || '';
                const name = m.name || m.user?.name || username;
                const profilePicture = m.profilePicture || m.user?.profilePicture;
                return (
                  <button
                    key={username}
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-white/8 transition-colors text-left"
                    onMouseDown={e => { e.preventDefault(); handleMentionSelect(username); }}
                  >
                    <Avatar user={{ username, name, profilePicture }} size={28} />
                    <div className="min-w-0">
                      <p className="text-discord-text text-sm font-semibold truncate">{name}</p>
                      <p className="text-discord-muted text-xs">@{username}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {/* Media Preview */}
          {mediaAttachment && (
            <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <div className="relative flex-shrink-0">
                <img
                  src={mediaAttachment.dataUrl}
                  alt="preview"
                  className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  title="Tap to crop"
                  onClick={() => {
                    setPendingImageSrc(mediaAttachment.dataUrl);
                    setShowCropModal(true);
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-[8px] font-bold bg-black/50 rounded px-1 opacity-0 hover:opacity-100">Crop</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-discord-text font-medium truncate">{mediaAttachment.filename}</p>
                <p className="text-[11px] text-discord-muted">Tap image to crop</p>
              </div>
              <button type="button" onClick={() => setMediaAttachment(null)} className="text-discord-muted hover:text-discord-red transition-colors flex-shrink-0">
                <FiX size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            {!group?.textOnly && (
            <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileAttach} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-discord-muted hover:text-discord-brand hover:bg-discord-brand/10 transition-colors"
                title="Attach photo"
              >
                <FiPaperclip size={18} />
              </button>
            </div>
            )}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={newMsg}
                onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                placeholder={mediaAttachment ? 'Add a caption...' : `Message ${group?.name || 'group'}...`}
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
                  onSelect={emoji => {
                    const ta = textareaRef.current;
                    if (!ta) { setNewMsg(prev => prev + emoji); setShowEmojiPicker(false); return; }
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    setNewMsg(prev => prev.slice(0, start) + emoji + prev.slice(end));
                    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + emoji.length; ta.focus(); }, 0);
                    setShowEmojiPicker(false);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                  anchor="top"
                />
              )}
            </div>
            <button type="submit" disabled={(!newMsg.trim() && !mediaAttachment) || sending} className="discord-btn p-2.5 rounded-lg disabled:opacity-40 flex-shrink-0 mb-0.5">
              <FiSend size={16} />
            </button>
          </div>
        </form>}
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
