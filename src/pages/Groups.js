import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import CreateGroupModal from '../components/CreateGroupModal';
import { FiSearch, FiPlus, FiUsers, FiMessageSquare, FiX } from 'react-icons/fi';
import API from '../utils/api';

const GroupJoinModal = ({ group, onClose, onJoin }) => {
  if (!group) return null;
  return (
    <div className="modal-overlay active" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: '400px', 
        width: '90%',
        borderRadius: '20px', 
        overflow: 'hidden',
        background: 'var(--card-bg)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
          height: '100px', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <button onClick={onClose} style={{ 
            position: 'absolute', 
            top: '12px', 
            right: '12px', 
            background: 'rgba(0,0,0,0.2)', 
            border: 'none', 
            borderRadius: '50%', 
            width: '32px', 
            height: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            cursor: 'pointer' 
          }}><FiX size={20} /></button>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--card-bg)', 
            border: '4px solid var(--card-bg)',
            position: 'absolute',
            bottom: '-40px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <img src={group.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
        <div style={{ padding: '50px 24px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{group.name}</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
            Group • {group.members?.length || 0} members
          </p>
          <div style={{ 
            background: 'var(--bg-dark)', 
            padding: '12px', 
            borderRadius: '12px', 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            {group.description || 'Welcome to our group! Join to start chatting with other members.'}
          </div>
          <button 
            onClick={() => onJoin(group._id)}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: '#25D366', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Join Group
          </button>
        </div>
      </div>
    </div>
  );
};

const Groups = ({ unreadCounts }) => {  // Add unreadCounts prop
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupToJoin, setSelectedGroupToJoin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchGroups();
  }, []);

  const handleJoinGroup = async (groupId) => {
    try {
      await API.joinGroup(groupId);
      setSelectedGroupToJoin(null);
      fetchGroups();
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      alert(error.message || 'Failed to join group');
    }
  };

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const data = await API.getGroups();
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const data = await API.createGroup(groupData);
      setGroups(prev => [data.group, ...prev]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner"></span>
      </div>
    );
  }

    return (
    <>
      <Navbar user={user} unreadCounts={unreadCounts} />
      
      <main className="main-content">
        <div className="groups-page">
          <div className="groups-header">
            <div>
              <h1>Groups</h1>
              <p>Connect with people who share your interests</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus size={20} /> Create Group
            </button>
          </div>
          
          <div className="groups-search">
            <FiSearch size={20} />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="groups-stats">
            <div className="stat-card">
              <FiUsers size={24} />
              <div>
                <h3>{groups.length}</h3>
                <p>Total Groups</p>
              </div>
            </div>
            <div className="stat-card">
              <FiMessageSquare size={24} />
              <div>
                <h3>{groups.reduce((acc, group) => acc + (group.unreadCount || 0), 0)}</h3>
                <p>Unread Messages</p>
              </div>
            </div>
          </div>
          
          <div className="groups-grid">
            {filteredGroups.length === 0 ? (
              <div className="empty-groups">
                <div className="empty-icon">👥</div>
                <h3>No Groups Yet</h3>
                <p>Create your first group or join existing ones</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Group
                </button>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isMember = group.members?.some(m => m === user?._id || m._id === user?._id);
                return (
                  <div key={group._id} onClick={() => {
                    if (isMember) {
                      navigate(`/groups/${group._id}`);
                    } else {
                      setSelectedGroupToJoin(group);
                    }
                  }} style={{ cursor: 'pointer' }}>
                    <GroupCard
                      group={group}
                      onGroupUpdated={fetchGroups}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {selectedGroupToJoin && (
        <GroupJoinModal
          group={selectedGroupToJoin}
          onClose={() => setSelectedGroupToJoin(null)}
          onJoin={handleJoinGroup}
        />
      )}
    </>
  );
};

export default Groups;