import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiUsers, FiInfo, FiTrash2, FiCopy, FiMoreVertical, FiLogOut, FiFlag, FiSmile } from 'react-icons/fi';
import ReportModal from '../components/ReportModal';
import { format, isToday, isYesterday } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import FormattedText from '../components/FormattedText';
import LinkPreview from '../components/LinkPreview';
import EmojiPicker from '../components/EmojiPicker';
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
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
      API.clearCache(`/api/groups/${groupId}/messages`);
      const data = await API.getGroupMessages(groupId);
      const msgs = Array.isArray(data) ? data : (data.messages || data.data || []);
      setMessages(msgs);
      scrollToBottom(true);
    } catch { }
    finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || sending) return;
    const text = newMsg.trim();
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }
    setSending(true);
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
                    <span
                      className={`text-xs font-semibold mb-1 cursor-pointer hover:underline ${sender.isSupa ? 'supa-chat-name' : ''}`}
                      style={sender.isSupa ? {} : { color: stringToColor(sender.username || '') }}
                      onClick={() => navigate(`/profile/${sender.username}`)}
                    >
                      {sender.name || sender.username}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 text-sm break-words shadow-sm transition-all duration-150
                      ${mine
                        ? 'bg-discord-brand text-white rounded-2xl rounded-br-sm'
                        : 'bg-white/6 border border-white/5 text-discord-text rounded-2xl rounded-bl-sm'}
                      ${isFirstInGroup ? '' : mine ? 'rounded-tr-lg' : 'rounded-tl-lg'}
                    `}
                  >
                    <FormattedText text={msg.text || ''} />
                  </div>
                  {msg.text && <LinkPreview text={msg.text} />}
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
          <div className="flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={newMsg}
                onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                placeholder={`Message ${group?.name || 'group'}...`}
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
            <button type="submit" disabled={!newMsg.trim() || sending} className="discord-btn p-2.5 rounded-lg disabled:opacity-40 flex-shrink-0 mb-0.5">
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
    </Layout>
  );
}

function stringToColor(str) {
  const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#00b0f4', '#9b59b6', '#e67e22'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
