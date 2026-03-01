import React, { useState, useEffect, useRef } from 'react';
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

const Groups = ({ unreadCounts }) => {
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedGroupToJoin, setSelectedGroupToJoin] = useState(null);
  
  const navigate = useNavigate();
  const isFetchingRef = useRef(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Initial fetch with delay
    setTimeout(() => {
      fetchGroups();
    }, 100);
  }, []);

  const fetchGroups = async (loadMore = false) => {
    if (isFetchingRef.current) return;
    
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    isFetchingRef.current = true;
    
    try {
      const data = await API.getGroups();
      let groupsArray = [];
      
      if (Array.isArray(data)) {
        groupsArray = data;
      } else if (data && data.groups && Array.isArray(data.groups)) {
        groupsArray = data.groups;
      } else if (data && data.data && Array.isArray(data.data)) {
        groupsArray = data.data;
      } else if (data && typeof data === 'object') {
        const arrays = Object.values(data).filter(Array.isArray);
        if (arrays.length > 0) {
          groupsArray = arrays[0];
        }
      }
      
      if (loadMore) {
        setGroups(prev => {
          const existingIds = new Set(prev.map(g => g._id));
          const newGroups = groupsArray.filter(g => !existingIds.has(g._id));
          return [...prev, ...newGroups];
        });
      } else {
        setGroups(groupsArray);
      }
      
      setHasMore(groupsArray.length === 20); // Assuming 20 per page
      
      // Retry logic for initial load
      if (!loadMore && groupsArray.length === 0 && initialLoadRef.current) {
        setTimeout(() => {
          if (groups.length === 0 && !isFetchingRef.current) {
            console.log('Retrying groups fetch...');
            fetchGroups();
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error fetching groups:', error);
      
      // Retry on error
      if (initialLoadRef.current) {
        setTimeout(() => {
          if (!isFetchingRef.current) {
            console.log('Retrying groups after error...');
            fetchGroups();
          }
        }, 3000);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
      initialLoadRef.current = false;
    }
  };

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

  const handleCreateGroup = async (groupData) => {
    try {
      const data = await API.createGroup(groupData);
      setGroups(prev => [data.group || data, ...prev]);
      setShowCreateModal(false);
      
      // Navigate to the new group
      const groupId = data.group?._id || data._id;
      if (groupId) {
        navigate(`/groups/${groupId}`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert(error.message || 'Failed to create group');
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && groups.length === 0) {
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
              <button className="btn btn-primary" disabled>
                <FiPlus size={20} /> Create Group
              </button>
            </div>
            
            <div className="groups-search">
              <FiSearch size={20} />
              <input type="text" placeholder="Search groups..." disabled />
            </div>
            
            <div className="groups-stats">
              <div className="stat-card">
                <FiUsers size={24} />
                <div>
                  <h3>...</h3>
                  <p>Total Groups</p>
                </div>
              </div>
              <div className="stat-card">
                <FiMessageSquare size={24} />
                <div>
                  <h3>...</h3>
                  <p>Unread Messages</p>
                </div>
              </div>
            </div>
            
            <div className="groups-grid">
              {[1, 2, 3].map(i => (
                <div key={i} className="group-card-skeleton">
                  <div className="skeleton-header"></div>
                  <div className="skeleton-content"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </>
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
                const isMember = group.members?.some(m => 
                  m === user?._id || 
                  m === user?.id || 
                  m._id === user?._id || 
                  m.userId === user?._id
                );
                return (
                  <div 
                    key={group._id} 
                    onClick={() => {
                      if (isMember) {
                        navigate(`/groups/${group._id}`);
                      } else {
                        setSelectedGroupToJoin(group);
                      }
                    }} 
                    style={{ cursor: 'pointer' }}
                  >
                    <GroupCard
                      group={group}
                      onGroupUpdated={fetchGroups}
                    />
                  </div>
                );
              })
            )}
          </div>
          
          {isLoadingMore && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="loading-spinner small"></div>
            </div>
          )}
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