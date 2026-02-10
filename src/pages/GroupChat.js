import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import GroupInfoModal from '../components/GroupInfoModal';
import EditGroupModal from '../components/EditGroupModal';
import AddMembersModal from '../components/AddMembersModal';
import { FiArrowLeft, FiUsers, FiSend, FiImage, FiMoreVertical, FiPlusSquare, FiSettings, FiTrash2, FiEdit2, FiLink, FiUserPlus, FiCopy, FiX } from 'react-icons/fi';
import API from '../utils/api';

const LinkPreview = ({ url }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const domain = new URL(url).hostname;
        setPreview({
          title: domain,
          description: `Visit ${domain}`,
          icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          url: url
        });
      } catch (e) {
        console.error('Failed to parse URL', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading || !preview) return null;

  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="link-preview-card" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '8px',
      marginTop: '8px',
      textDecoration: 'none',
      color: 'inherit',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <img src={preview.icon} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.title}</div>
        <div style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.description}</div>
      </div>
    </a>
  );
};

const GroupChat = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState({ x: 0, y: 0 });
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const messagesEndRef = useRef(null);
  const optionsRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchGroup();
    fetchMessages();
    
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptionsMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchGroup = async () => {
    try {
      const data = await API.request(`/api/groups/${groupId}`);
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group:', error);
      navigate('/groups');
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const data = await API.request(`/api/groups/${groupId}/messages`);
      setMessages(data.messages || data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const messageData = {
        groupId,
        text: newMessage.trim()
      };

      await API.request(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showMentions && mentionSuggestions.length > 0) {
        e.preventDefault();
        applyMention(mentionSuggestions[0]);
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const lastChar = value[value.length - 1];
    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const search = lastWord.substring(1);
      setMentionSearch(search);
      if (group && group.members) {
        const filtered = group.members.filter(m => 
          m.username?.toLowerCase().startsWith(search.toLowerCase())
        );
        setMentionSuggestions(filtered);
        setShowMentions(filtered.length > 0);
      }
    } else {
      setShowMentions(false);
    }
  };

  const applyMention = (member) => {
    const words = newMessage.split(/\s/);
    words[words.length - 1] = `@${member.username} `;
    setNewMessage(words.join(' '));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const renderMessageText = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:@[a-zA-Z0-9_]+))/g);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>{part}</a>;
      }
      if (part.match(mentionRegex)) {
        const username = part.substring(1);
        const memberExists = group?.members?.some(m => m.username === username);
        
        if (!memberExists) return <span key={i}>{part}</span>;

        return (
          <Link 
            key={i} 
            to={`/profile/${username}`} 
            style={{ 
              color: 'var(--mention-color)', 
              fontWeight: '600', 
              textDecoration: 'none',
              textShadow: '0 0 1px rgba(0,0,0,0.2)'
            }}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const toggleOptionsMenu = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOptionsPosition({ 
      x: rect.left,
      y: rect.bottom + 10
    });
    setShowOptionsMenu(!showOptionsMenu);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await API.leaveGroup(groupId);
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      alert(error.message || 'Failed to leave group');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const response = await API.request(`/api/groups/${groupId}/invite-code`, {
        method: 'POST'
      });
      const link = `${window.location.origin}/join/${response.inviteCode || response.code || groupId}`;
      setInviteLink(link);
      setShowInviteModal(true);
      setShowOptionsMenu(false);
    } catch (error) {
      console.error('Error generating invite:', error);
      alert('Failed to generate invite link');
    }
  };

  const handleCopyInvite = () => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        fallbackCopy(inviteLink);
      });
  } else {
    fallbackCopy(inviteLink);
  }
};

const fallbackCopy = (text) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  } catch (err) {
    console.error('Fallback copy failed:', err);
    alert('Could not copy link. Please copy it manually: ' + text);
  }  
  document.body.removeChild(textArea);
};

  const handleEditGroup = () => {
    setShowEditGroup(true);
    setShowOptionsMenu(false);
  };

  const handleAddMembers = () => {
    setShowAddMembers(true);
    setShowOptionsMenu(false);
  };

  const handleGroupInfo = () => {
    setShowGroupInfo(true);
    setShowOptionsMenu(false);
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await API.request(`/api/groups/${groupId}`, { method: 'DELETE' });
      navigate('/groups');
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner"></span>
      </div>
    );
  }

  if (!group) return null;

  const isAdmin = group.adminId === user?._id || group.admin === user?._id || group.adminId === user?.id || group.admin === user?.id;

  return (
    <div className="group-chat-page-wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar user={user} />
      
      <main className="content-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 'var(--navbar-height)' }}>
        <div className="group-chat-page chat-open" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div className="group-chat-header" style={{ background: 'var(--card-bg)', display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', minHeight: '60px', flexShrink: 0 }}>
            <button className="btn-icon" onClick={() => navigate('/groups')}>
              <FiArrowLeft size={24} />
            </button>
            <div className="group-chat-info" style={{ flex: 1, marginLeft: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>{group.name}</h2>
              <div className="group-members-count" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiUsers size={14} /> {group.members?.length || 0} members
              </div>
            </div>
            <div className="relative" ref={optionsRef}>
              <button className="btn-icon" onClick={toggleOptionsMenu}>
                <FiMoreVertical size={24} />
              </button>
              {showOptionsMenu && (
                <div className="options-menu" style={{ position: 'fixed', top: `${optionsPosition.y}px`, left: `${optionsPosition.x - 180}px`, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px 0', width: '200px', zIndex: 10000, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                  <button onClick={handleGroupInfo} className="menu-item"><FiUsers size={16} /> <span>Group Info</span></button>
                  <button onClick={handleGenerateInvite} className="menu-item"><FiLink size={16} /> <span>Invite Link</span></button>
                  {isAdmin && (
                    <>
                      <button onClick={handleAddMembers} className="menu-item"><FiUserPlus size={16} /> <span>Add Members</span></button>
                      <button onClick={handleEditGroup} className="menu-item"><FiEdit2 size={16} /> <span>Edit Group</span></button>
                      <div className="menu-divider" />
                      <button onClick={handleDeleteGroup} className="menu-item danger"><FiTrash2 size={16} /> <span>Delete Group</span></button>
                    </>
                  )}
                  <div className="menu-divider" />
                  <button onClick={handleLeaveGroup} className="menu-item danger"><FiTrash2 size={16} /> <span>Leave Group</span></button>
                </div>
              )}
            </div>
          </div>
          
          <div className="group-chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#000' }}>
            <div className="group-chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.length === 0 ? (
                <div className="empty-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  <div className="empty-chat-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                  <h3>No messages yet</h3>
                  <p>Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId?._id === user?._id || message.senderId === user?._id || message.sender?._id === user?._id;
                  const urls = message.text?.match(/(https?:\/\/[^\s]+)/g) || [];
                  return (
                    <div key={message._id || message.id} className={`message-bubble-container ${isOwn ? 'own' : 'other'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', width: '100%' }}>
                      {!isOwn && (
                        <div className="message-sender" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', marginLeft: '4px' }}>
                          <img src={message.senderId?.profilePicture || message.sender?.profilePicture || '/default-avatar.png'} alt={message.senderId?.username || message.sender?.username || 'User'} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                          <span className="message-sender-name" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{message.senderId?.username || message.sender?.username || 'User'}</span>
                        </div>
                      )}
                      <div className={`message-bubble ${isOwn ? 'own' : 'other'}`} style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '18px', background: isOwn ? 'var(--primary)' : 'var(--card-bg-light)', color: '#fff', position: 'relative', borderBottomRightRadius: isOwn ? '4px' : '18px', borderBottomLeftRadius: isOwn ? '18px' : '4px' }}>
                        <div className="message-text" style={{ fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {renderMessageText(message.text)}
                        </div>
                        {urls.length > 0 && <LinkPreview url={urls[0]} />}
                        <div className="message-time" style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7, textAlign: 'right' }}>{formatTime(message.createdAt || message.timestamp)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="group-chat-input" onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
              {showMentions && (
                <div className="mention-suggestions" style={{ position: 'absolute', bottom: '100%', left: '16px', right: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 -4px 12px rgba(0,0,0,0.3)' }}>
                  {mentionSuggestions.map(member => (
                    <div key={member._id} onClick={() => applyMention(member)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                      <img src={member.profilePicture || '/default-avatar.png'} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                      <span style={{ fontWeight: '600' }}>@{member.username}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="btn-icon"><FiImage size={20} /></button>
              <div className="message-input-wrapper" style={{ flex: 1, background: 'var(--bg-dark)', borderRadius: '24px', padding: '8px 16px', border: '1px solid var(--border-color)' }}>
                <textarea ref={inputRef} className="message-input" placeholder="Message..." value={newMessage} onChange={handleInputChange} onKeyPress={handleKeyPress} rows={1} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', resize: 'none', fontSize: '15px', display: 'block', paddingTop: '4px' }} />
              </div>
              <button type="submit" className="send-btn" disabled={!newMessage.trim() || isSending} style={{ background: 'var(--primary)', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!newMessage.trim() || isSending) ? 0.5 : 1 }}>
                <FiSend size={20} />
              </button>
            </form>
          </div>
        </div>
      </main>

      {showGroupInfo && <GroupInfoModal groupId={groupId} onClose={() => setShowGroupInfo(false)} />}
      {showEditGroup && <EditGroupModal groupId={groupId} onClose={() => setShowEditGroup(false)} onGroupUpdated={(updatedGroup) => { setGroup(updatedGroup); setShowEditGroup(false); }} />}
      {showAddMembers && <AddMembersModal groupId={groupId} onClose={() => setShowAddMembers(false)} onMembersAdded={(newMembers) => { setGroup(prev => ({ ...prev, members: [...(prev.members || []), ...newMembers] })); setShowAddMembers(false); }} />}
      {showInviteModal && (
        <div className="modal-overlay active" onClick={() => setShowInviteModal(false)}>
          <div className="modal invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setShowInviteModal(false)}><FiX size={24} /></button>
              <span className="modal-title">Invite Link</span>
            </div>
            <div className="modal-content">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Share this link to invite people to join <strong>{group.name}</strong></p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input type="text" value={inviteLink} readOnly style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }} />
                <button onClick={handleCopyInvite} style={{ padding: '10px 16px', background: inviteCopied ? 'var(--success)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{inviteCopied ? 'Copied!' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>This link will expire in 7 days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
