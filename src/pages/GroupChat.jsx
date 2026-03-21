import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiUsers, FiInfo, FiTrash2, FiCopy, FiMoreVertical, FiLogOut, FiFlag, FiSmile, FiPaperclip, FiPhone, FiVideo, FiX, FiMoreHorizontal, FiSave } from 'react-icons/fi';
import ImageCropModal from '../components/ImageCropModal';
import ReportModal from '../components/ReportModal';
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const myId = currentUser?._id || currentUser?.id;
  const isAdmin = group?.admin?._id === myId || group?.admin === myId;

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

  const handleFileAttach = (e) => {
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
    const savedAttachment = mediaAttachment;
    const savedMsg = newMsg;
    setSending(true);
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }
    if (mediaAttachment?.type === 'image') {
      text = `[vx:img:${mediaAttachment.dataUrl}]${text ? '\n' + text : ''}`;
      setMediaAttachment(null);
    }
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
      const data = await API.sendGroupMessage(groupId, text);
      const realMsg = data?.message || data;
      if (realMsg?._id && realMsg._id !== tempId) {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...realMsg } : m));
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setMediaAttachment(savedAttachment);
      setNewMsg(savedMsg);
    }
    finally { setSending(false); }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    socket.setGroupTyping({ groupId, username: currentUser?.username });
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
              <p className="font-bold text-discord-text text-sm truncate">{group?.name}</p>
              <p className="text-discord-muted text-xs">{group?.members?.length || 0} members</p>
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
            return (
              <div
                key={item.key}
                className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} group`}
                onContextMenu={e => handleMessageContextMenu(e, msg)}
              >
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
                      {sender.badge && getBadgeById(sender.badge) && <AnimatedBadge badgeId={sender.badge} size="0.85em" />}
                    </span>
                  )}
                  <div
                    className={`text-sm break-words shadow-sm transition-all duration-150
                      ${(msg.text || '').startsWith('[vx:img:') || (msg.text || '').startsWith('[vx:call:')
                        ? 'bg-transparent p-0 border-0'
                        : `px-3 py-2 ${mine
                          ? 'bg-discord-brand text-white rounded-2xl rounded-br-sm'
                          : 'bg-white/6 border border-white/5 text-discord-text rounded-2xl rounded-bl-sm'}
                          ${isFirstInGroup ? '' : mine ? 'rounded-tr-lg' : 'rounded-tl-lg'}`}
                    `}
                  >
                    {(() => {
                      const text = msg.text || '';
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
                    })()}
                  </div>
                  {msg.text && !msg.text.startsWith('[vx:') && <LinkPreview text={msg.text} />}
                  {isFirstInGroup && (
                    <span className="text-discord-muted text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : ''}
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

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 pt-3 pb-20 md:pb-3 border-t border-white/6 flex-shrink-0">
          {/* Media Preview */}
          {mediaAttachment && (
            <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <img src={mediaAttachment.dataUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
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
        </form>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-discord-dark border border-white/10 rounded-xl shadow-2xl py-1 min-w-36 backdrop-blur-xl"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 120), left: Math.min(contextMenu.x, window.innerWidth - 170) }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-discord-text hover:bg-white/5 transition-colors"
            onClick={() => copyMessage(contextMenu.msg.text)}
          >
            <FiCopy size={13} /> Copy Text
          </button>
          {contextMenu.senderUserId && contextMenu.senderUserId !== (currentUser?._id || currentUser?.id) && (
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
