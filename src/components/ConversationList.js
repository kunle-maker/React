import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageSquare, FiUserPlus, FiSearch, FiEdit } from 'react-icons/fi';

const ConversationList = ({ 
  conversations = [], 
  onSelectConversation, 
  searchQuery = '', 
  selectedConversationId,
  isLoading = false 
}) => {
  const [filteredConversations, setFilteredConversations] = useState([]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const [showNewChatModal, setShowNewChatModal] = useState(false);

  if (isLoading) {
    return (
      <div className="conversations-loading">
        <div className="loading-spinner small"></div>
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="empty-conversations">
        <div className="empty-conversations-icon">
          <FiMessageSquare size={48} />
        </div>
        <h3>No conversations yet</h3>
        <p>Start a conversation by searching for users</p>
        <Link to="/search" className="btn btn-primary">
          <FiUserPlus size={16} /> Find People
        </Link>
      </div>
    );
  }

  if (filteredConversations.length === 0 && searchQuery) {
    return (
      <div className="no-search-results">
        <div className="no-results-icon">
          <FiSearch size={48} />
        </div>
        <h3>No results found</h3>
        <p>Try searching for something else</p>
      </div>
    );
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Messages</h2>
        <button 
          className="new-chat-btn"
          onClick={() => setShowNewChatModal(true)}
          title="New Message"
        >
          <FiEdit size={20} />
        </button>
      </div>

      {showNewChatModal && (
        <NewChatModal onClose={() => setShowNewChatModal(false)} />
      )}

      <div className="conversations-container">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation.user?._id || conversation._id}
            className={`conversation-item ${selectedConversationId === conversation.user?._id ? 'selected' : ''}`}
            onClick={() => onSelectConversation(conversation)}
          >
            <div className="conversation-avatar-wrapper">
              <img
                src={conversation.user?.profilePicture || '/default-avatar.png'}
                alt={conversation.user?.username}
                className="conversation-avatar"
              />
              {conversation.user?.isOnline && (
                <div className="online-indicator"></div>
              )}
            </div>
            
            <div className="conversation-content">
              <div className="conversation-header">
                <div className="conversation-user-info">
                  <span className="conversation-username">
                    {conversation.user?.username || 'Unknown User'}
                  </span>
                </div>
                <div className="conversation-meta">
                  <span className="conversation-time">
                    {formatTime(conversation.lastMessage?.createdAt)}
                  </span>
                </div>
              </div>
              
              <div className="conversation-preview">
                <p className="last-message">
                  {truncateText(conversation.lastMessage?.text || 'No messages yet')}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="unread-badge">{conversation.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple New Chat Modal component
const NewChatModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setUsers([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`https://vesselx.onrender.com/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setUsers(data.users || data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = (user) => {
    window.location.href = `/#/messages?user=${user.username}`;
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>×</button>
          <span className="modal-title">New Message</span>
        </div>
        <div className="modal-content" style={{ padding: '0' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              placeholder="Search people..." 
              className="form-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {isLoading && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div className="loading-spinner small"></div>
              </div>
            )}
            {users.map(user => (
              <div 
                key={user._id} 
                onClick={() => startChat(user)} 
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }} 
                className="user-suggestion-item"
              >
                <img src={user.profilePicture || '/default-avatar.png'} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: '600' }}>@{user.username}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationList;