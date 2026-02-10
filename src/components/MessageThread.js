import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiImage, FiSmile, FiMoreVertical, FiArrowLeft } from 'react-icons/fi';
import MessageBubble from './MessageBubble';
import MessageOptionsMenu from './MessageOptionsMenu';
import API from '../utils/api';

const MessageThread = ({ conversation, messages, onSendMessage, onBack }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState({ x: 0, y: 0 });
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage);
    setNewMessage('');
    setShowMentions(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showMentions && mentionSuggestions.length > 0) {
        e.preventDefault();
        applyMention(mentionSuggestions[0]);
      }
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const search = lastWord.substring(1);
      if (search.length > 0) {
        try {
          const data = await API.searchUsers(search);
          const users = data.users || data || [];
          setMentionSuggestions(users);
          setShowMentions(users.length > 0);
        } catch (error) {
          console.error('Mention search error:', error);
        }
      }
    } else {
      setShowMentions(false);
    }
  };

  const applyMention = (user) => {
    const words = newMessage.split(/\s/);
    words[words.length - 1] = `@${user.username} `;
    setNewMessage(words.join(' '));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleOptionsClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOptionsPosition({ 
      x: window.innerWidth < 768 ? rect.left : rect.right,
      y: rect.bottom 
    });
    setShowOptions(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="message-thread-container">
      <div className="message-thread-header">
        {onBack && (
          <button className="back-btn btn-icon" onClick={onBack}>
            <FiArrowLeft size={24} />
          </button>
        )}
        <div className="thread-user">
          <img
            src={conversation?.user?.profilePicture || '/default-avatar.png'}
            alt={conversation?.user?.username || 'User'}
            className="thread-user-avatar"
          />
          <div className="thread-user-info">
            <div className="thread-username">{conversation?.user?.username || 'User'}</div>
            <div className="thread-status">
              {isTyping ? 'typing...' : conversation?.user?.isOnline ? 'online' : 'offline'}
            </div>
          </div>
        </div>
        <button className="btn-icon" onClick={handleOptionsClick}>
          <FiMoreVertical size={20} />
        </button>
      </div>
      
      <div className="messages-container">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <React.Fragment key={date}>
            <div className="messages-date">
              <span>{date}</span>
            </div>
            {dateMessages.map((message) => (
<MessageBubble
  key={message._id || message.id}
  message={message}
  isOwn={
    message.senderId === currentUser?._id || 
    message.senderId?._id === currentUser?._id ||
    message.sender === currentUser?.username
  }
/>
            ))}
          </React.Fragment>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="message-input-container" style={{ position: 'relative' }}>
        {showMentions && (
          <div className="mention-suggestions" style={{ position: 'absolute', bottom: '100%', left: '16px', right: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 -4px 12px rgba(0,0,0,0.3)' }}>
            {mentionSuggestions.map(user => (
              <div key={user._id} onClick={() => applyMention(user)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>
                <img src={user.profilePicture || '/default-avatar.png'} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                <span style={{ fontWeight: '600' }}>@{user.username}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.name}</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn-icon">
          <FiImage size={20} />
        </button>
        <button className="btn-icon">
          <FiSmile size={20} />
        </button>
        <div className="message-input-wrapper">
          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="Message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            rows={1}
          />
        </div>
        <button 
          className="send-btn"
          onClick={handleSend}
          disabled={!newMessage.trim()}
        >
          <FiSend size={20} />
        </button>
      </div>

      {showOptions && conversation?.user && (
        <MessageOptionsMenu
          isGroup={false}
          target={conversation.user}
          onClose={() => setShowOptions(false)}
          isOpen={showOptions}
          position={optionsPosition}
        />
      )}
    </div>
  );
};

export default MessageThread;