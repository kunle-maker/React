import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSend, FiArrowLeft, FiMessageSquare, FiSearch, FiCheck, FiCheckCircle, FiTrash2, FiCopy, FiX, FiMoreHorizontal, FiFlag, FiSmile } from 'react-icons/fi';
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);
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
            lastMessage: message.text,
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
            lastMessage: c.lastMessage?.text || '',
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv || sending) return;
    const text = newMsg.trim();
    setNewMsg('');
    if (textareaRef.current) { textareaRef.current.style.height = '42px'; }
    setSending(true);
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
        lastMessage: text,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isMine: true,
      };
      return [updated, ...prev.filter(c => c.username !== activeConv.username)];
    });
    try {
      await API.sendMessage({ receiverUsername: activeConv.username, text });
    } catch { setMessages(prev => prev.filter(m => m._id !== tempMsg._id)); }
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
                      {c.lastMessage ? (
                        <span
                          className="truncate twemoji-inline"
                          dangerouslySetInnerHTML={{ __html: parseEmojisToHtml(c.lastMessage.length > 40 ? c.lastMessage.slice(0, 40) + '…' : c.lastMessage) }}
                        />
                      ) : (
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
                  <FormattedText text={msg.text} />
                </div>
                {msg.text && <LinkPreview text={msg.text} />}
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
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={newMsg}
              onChange={e => { handleTyping(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
              placeholder={`Message @${activeConv.username}...`}
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
            disabled={!newMsg.trim() || sending}
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
    </Layout>
  );
}
