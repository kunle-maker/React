import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { FiUsers, FiX, FiCheck } from 'react-icons/fi';
import API from '../utils/api';

const JoinGroup = () => {
  const { inviteCode } = useParams();
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchGroupDetails();
  }, [inviteCode]);

  const fetchGroupDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First try to fetch by invite code
      const data = await API.request(`/api/groups/invite/${inviteCode}`);
      setGroup(data.group || data);
    } catch (err) {
      console.error('Error fetching group by invite code:', err);
      setError(err.message || 'Invalid or expired invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!group || isJoining) return;
    setIsJoining(true);
    try {
      await API.request(`/api/groups/join/${inviteCode}`, {
        method: 'POST'
      });
      navigate(`/groups/${group._id}`);
    } catch (err) {
      console.error('Error joining group:', err);
      alert(err.message || 'Failed to join group');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <span className="loading-spinner"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-page" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h2>Oops!</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/groups')}>
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <>
      <Navbar user={user} />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)' }}>
        <div className="modal" style={{ 
          maxWidth: '400px', 
          width: '90%',
          borderRadius: '20px', 
          overflow: 'hidden',
          background: 'var(--card-bg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          position: 'relative',
          display: 'block'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', 
            height: '100px', 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <button onClick={() => navigate('/groups')} style={{ 
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
              <img src={group?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || 'Group')}&background=random`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div style={{ padding: '50px 24px 24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{group?.name}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
              Group • {group?.members?.length || 0} members
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
              {group?.description || 'Welcome to our group! Join to start chatting with other members.'}
            </div>
            <button 
              onClick={handleJoin}
              disabled={isJoining}
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
                gap: '8px',
                opacity: isJoining ? 0.7 : 1
              }}
            >
              {isJoining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default JoinGroup;