import React, { useState } from 'react';
import { FiUsers, FiLink, FiEdit, FiTrash2, FiUser, FiSettings, FiCopy, FiX, FiUserX } from 'react-icons/fi';
import API from '../utils/api';

const MessageOptionsMenu = ({ isGroup, target, onClose, isOpen, position }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateInvite = async () => {
    try {
      const response = await API.request(`/api/groups/${target._id}/invite-code`, {
        method: 'POST'
      });
      const link = `${window.location.origin}/join/${response.inviteCode || response.code}`;
      setInviteLink(link);
      setShowInviteModal(true);
      onClose();
    } catch (error) {
      console.error('Error generating invite:', error);
      alert('Failed to generate invite link');
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await API.request(`/api/groups/${target._id}/leave`, {
        method: 'POST'
      });
      window.location.href = '/#/groups';
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  const handleViewProfile = () => {
    window.location.href = `/#/profile/${target.username}`;
  };

  const handleBlockUser = async () => {
    if (!window.confirm(`Block @${target.username}? You won't receive messages from them.`)) return;
    
    try {
      await API.request(`/api/users/${target.username}/block`, {
        method: 'POST'
      });
      alert('User blocked successfully');
      onClose();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="options-menu-overlay" 
        onClick={onClose}
      />
      
      <div 
        className="options-menu"
        style={{
          position: 'fixed',
          top: position.y + 10,
          left: position.x - 180,
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '8px 0',
          width: '180px',
          zIndex: 10000,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
        }}
      >
        {isGroup ? (
          <>
            <button className="menu-item" onClick={() => window.location.href = `/#/groups/${target._id}/info`}>
              <FiUsers size={16} /> <span>Group Info</span>
            </button>
            <button className="menu-item" onClick={handleGenerateInvite}>
              <FiLink size={16} /> <span>Invite Link</span>
            </button>
            <button className="menu-item" onClick={() => window.location.href = `/#/groups/${target._id}/add-members`}>
              <FiUser size={16} /> <span>Add Members</span>
            </button>
            <button className="menu-item" onClick={() => window.location.href = `/#/groups/${target._id}/edit`}>
              <FiEdit size={16} /> <span>Edit Group</span>
            </button>
            <div className="menu-divider" />
            <button className="menu-item danger" onClick={handleLeaveGroup}>
              <FiTrash2 size={16} /> <span>Leave Group</span>
            </button>
          </>
        ) : (
          <>
            <button className="menu-item" onClick={handleViewProfile}>
              <FiUser size={16} /> <span>View Profile</span>
            </button>
          </>
        )}
      </div>

      {showInviteModal && (
        <div className="modal-overlay active">
          <div className="modal invite-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setShowInviteModal(false)}>
                <FiX size={24} />
              </button>
              <span className="modal-title">Invite Link</span>
            </div>
            <div className="modal-content">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Share this link to invite people to join <strong>{target.name}</strong>
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
                <button 
                  onClick={handleCopyInvite}
                  style={{
                    padding: '10px 16px',
                    background: copied ? 'var(--success)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                This link will expire in 7 days
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageOptionsMenu;