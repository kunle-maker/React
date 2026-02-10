import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import CreateGroupModal from '../components/CreateGroupModal';
import { FiSearch, FiPlus, FiUsers, FiMessageSquare } from 'react-icons/fi';
import API from '../utils/api';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchGroups();
  }, []);

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
      <Navbar user={user} />
      
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
              filteredGroups.map((group) => (
                <GroupCard
                  key={group._id}
                  group={group}
                  onGroupUpdated={fetchGroups}
                />
              ))
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
    </>
  );
};

export default Groups;