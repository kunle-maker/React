import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiCalendar, FiGlobe, FiLock, FiStar, FiEdit, FiTrash2, FiUser } from 'react-icons/fi';
import API from '../utils/api';

const GroupInfoModal = ({ groupId, onClose }) => {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGroupInfo();
  }, [groupId]);

  const fetchGroupInfo = async () => {
    setIsLoading(true);
    try {
      // Fetch group details
      const groupData = await API.request(`/api/groups/${groupId}`);
      setGroup(groupData);
      
      // Fetch group members
      const membersData = await API.request(`/api/groups/${groupId}/members`);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching group info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="modal-overlay active">
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">Group Info</span>
            <button className="modal-close" onClick={onClose}>
              <FiX size={24} />
            </button>
          </div>
          <div className="modal-content">
            <div className="loading-spinner" style={{ margin: '40px auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const isAdmin = group.adminId === currentUser?._id || group.admin === currentUser?._id || group.adminId === currentUser?.id || group.admin === currentUser?.id;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal group-info-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
          <span className="modal-title">Group Info</span>
          <div style={{ width: '32px' }}></div> {/* Spacer for alignment */}
        </div>

        <div className="modal-content">
          <div className="group-info-header">
            {group.profilePicture ? (
              <img
                src={group.profilePicture}
                alt={group.name}
                className="group-info-avatar"
              />
            ) : (
              <div className="group-info-avatar-initials">
                {group.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            
            <div className="group-info-title">
              <h2>{group.name}</h2>
              <div className="group-badges">
                {group.privacy && (
                  <div className="group-privacy-badge">
                    {group.privacy === 'public' ? (
                      <>
                        <FiGlobe size={12} /> Public
                      </>
                    ) : (
                      <>
                        <FiLock size={12} /> Private
                      </>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <div className="group-admin-badge">
                    <FiStar size={12} /> Administrator
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="group-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {isAdmin && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => window.location.href = `/groups/${groupId}/edit`}>
                  <FiEdit size={16} className="mr-2" /> Edit
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/groups/${groupId}/add-members`}>
                  <FiUser size={16} className="mr-2" /> Add
                </button>
              </>
            )}
            
            <button className="btn btn-danger btn-sm" onClick={async () => {
              if (window.confirm('Are you sure you want to leave this group?')) {
                try {
                  await API.leaveGroup(groupId);
                  window.location.href = '/groups';
                } catch (err) { alert(err.message || 'Failed to leave group'); }
              }
            }}>
              Leave Group
            </button>

            {isAdmin && (
              <button className="btn btn-danger btn-sm" style={{ gridColumn: 'span 2' }} onClick={async () => {
                if (window.confirm('Are you sure you want to delete this group?')) {
                  try {
                    await API.request(`/api/groups/${groupId}`, { method: 'DELETE' });
                    window.location.href = '/groups';
                  } catch (err) { alert('Failed to delete group'); }
                }
              }}>
                <FiTrash2 size={16} className="mr-2" /> Delete Group
              </button>
            )}
          </div>

          {group.description && (
            <div className="group-info-section">
              <h3>Description</h3>
              <p className="group-description">{group.description}</p>
            </div>
          )}

          <div className="group-info-section">
            <h3>Group Details</h3>
            <div className="group-details-grid">
              <div className="group-detail">
                <FiUsers size={16} />
                <div>
                  <div className="detail-label">Members</div>
                  <div className="detail-value">{group.members?.length || members.length} members</div>
                </div>
              </div>
              
              <div className="group-detail">
                <FiCalendar size={16} />
                <div>
                  <div className="detail-label">Created</div>
                  <div className="detail-value">
                    {formatDate(group.createdAt || group.createdDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group-info-section">
            <div className="section-header">
              <h3>Members</h3>
              <span className="member-count">{members.length} members</span>
            </div>
            
            <div className="members-list">
              {members.map((member) => (
                <div key={member._id} className="member-item">
                  <img
                    src={member.profilePicture || '/default-avatar.png'}
                    alt={member.username}
                    className="member-avatar"
                  />
                  
                  <div className="member-info">
                    <div className="member-name">
                      {member.name || member.username}
                      {member._id === group.adminId || member._id === group.admin ? (
  <span className="admin-badge">
    <FiStar size={12} /> Admin
  </span>
) : null}
                    </div>
                    <div className="member-username">@{member.username}</div>
                  </div>
                  
                  {isAdmin && member._id !== currentUser?._id && (
                    <button className="btn btn-text btn-sm">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {group.createdBy && (
            <div className="group-info-footer">
              <p className="created-by">
                Created by @{group.createdBy.username || 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;