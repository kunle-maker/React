import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUserPlus, FiCheck, FiUsers } from 'react-icons/fi';
import API from '../utils/api';

const AddMembersModal = ({ groupId, onClose, onMembersAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrentMembers();
  }, [groupId]);

  const fetchCurrentMembers = async () => {
    try {
      const data = await API.request(`/api/groups/${groupId}/members`);
      setCurrentMembers(data || []);
    } catch (error) {
      console.error('Error fetching current members:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await API.searchUsers(query);
      
      // Filter out users who are already members
      const filteredResults = (data || []).filter(user => 
        !currentMembers.some(member => member._id === user._id || member.userId === user._id)
      );
      
      setSearchResults(filteredResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      const memberIds = selectedUsers.map(user => user._id);
      
      await API.request(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberIds })
      });

      if (onMembersAdded) {
        onMembersAdded(selectedUsers);
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding members:', error);
      setError(error.message || 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyMember = (userId) => {
    return currentMembers.some(member => member._id === userId || member.userId === userId);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal add-members-modal">
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
          <span className="modal-title">Add Members</span>
          <button 
            className="btn btn-primary"
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : `Add (${selectedUsers.length})`}
          </button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="search-section">
            <div className="search-input-wrapper">
              <FiSearch size={20} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search users by username or name..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="selected-users-section">
              <h4>Selected to Add ({selectedUsers.length})</h4>
              <div className="selected-users-list">
                {selectedUsers.map(user => (
                  <div key={user._id} className="selected-user-chip">
                    <img
                      src={user.profilePicture || '/default-avatar.png'}
                      alt={user.username}
                      className="user-avatar-sm"
                    />
                    <span>@{user.username}</span>
                    <button 
                      onClick={() => toggleUserSelection(user)}
                      className="remove-chip-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="search-results-section">
            <h4>Search Results</h4>
            
            {isLoading ? (
              <div className="loading-results">
                <div className="loading-spinner small"></div>
                <p>Searching users...</p>
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <div className="no-results">
                <FiSearch size={32} />
                <p>No users found</p>
              </div>
            ) : (
              <div className="users-list">
                {searchResults.map(user => {
                  const isSelected = selectedUsers.some(u => u._id === user._id);
                  const isMember = isAlreadyMember(user._id);
                  
                  return (
                    <div 
                      key={user._id} 
                      className={`user-result-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !isMember && toggleUserSelection(user)}
                    >
                      <img
                        src={user.profilePicture || '/default-avatar.png'}
                        alt={user.username}
                        className="user-avatar"
                      />
                      
                      <div className="user-info">
                        <div className="user-name">
                          {user.name || user.username}
                          {isMember && (
                            <span className="member-badge">
                              <FiUsers size={12} /> Already member
                            </span>
                          )}
                        </div>
                        <div className="user-username">@{user.username}</div>
                      </div>
                      
                      {isMember ? (
                        <div className="already-member">Member</div>
                      ) : (
                        <button 
                          className={`select-user-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleUserSelection(user)}
                        >
                          {isSelected ? <FiCheck size={16} /> : <FiUserPlus size={16} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;