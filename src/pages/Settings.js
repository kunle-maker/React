import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../utils/api';
import { FiEdit2, FiCamera, FiLock } from 'react-icons/fi';

const Settings = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name || '',
    bio: user.bio || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updatedUser = await API.request('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: editData.name.trim(),
          bio: editData.bio.trim()
        })
      });
      
      const userData = updatedUser.user || updatedUser;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file); // Must be 'profilePicture' as per API
    formData.append('name', user.name || '');
    formData.append('bio', user.bio || '');

    setIsLoading(true);
    try {
      const updatedUser = await API.request('/api/profile', {
        method: 'PUT',
        body: formData
      });
      
      const userData = updatedUser.user || updatedUser;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Failed to update profile picture');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await API.request('/api/account', {
        method: 'DELETE'
      });
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Navbar user={user} />
      
      <main className="main-content">
        <div className="settings-page">
          <h1>Settings</h1>
          
          <div className="settings-card">
            {isEditing ? (
              <form className="edit-profile-form" onSubmit={handleUpdateProfile}>
                <div className="settings-profile">
                  <div className="avatar-edit-wrapper">
                    <img
                      src={user.profilePicture || '/default-avatar.png'}
                      alt={user.username}
                      className="settings-avatar"
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=' + (user.name || user.username) + '&background=random';
                      }}
                    />
                    <label htmlFor="avatar-upload" className="avatar-edit-overlay">
                      <FiCamera />
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarChange} 
                        hidden 
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                  <div className="settings-profile-info">
                    <input 
                      className="form-input"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      placeholder="Name"
                      required
                      minLength="2"
                      maxLength="50"
                      disabled={isLoading}
                    />
                    <div className="settings-username">@{user.username}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input 
                    className="form-input"
                    type="email"
                    value={user.email || ''}
                    disabled
                    title="Email cannot be changed"
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                  <div className="password-hint" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <FiLock size={12} />
                    <span>Email cannot be changed</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea 
                    className="form-input"
                    value={editData.bio}
                    onChange={(e) => setEditData({...editData, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                    rows="4"
                    maxLength="500"
                    disabled={isLoading}
                  />
                  <div className="password-hint">
                    {editData.bio.length}/500 characters
                  </div>
                </div>

                <div className="settings-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isLoading || !editData.name.trim()}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        name: user.name || '',
                        bio: user.bio || ''
                      });
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="settings-profile">
                  <div className="avatar-edit-wrapper">
                    <img
                      src={user.profilePicture || '/default-avatar.png'}
                      alt={user.username}
                      className="settings-avatar"
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=' + (user.name || user.username) + '&background=random';
                      }}
                    />
                    <label htmlFor="avatar-upload-edit" className="avatar-edit-overlay">
                      <FiCamera />
                      <input 
                        id="avatar-upload-edit" 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarChange} 
                        hidden 
                      />
                    </label>
                  </div>
                  <div className="settings-profile-info">
                    <div className="settings-name">{user.name || 'No name set'}</div>
                    <div className="settings-username">@{user.username}</div>
                    <div className="settings-email">
                      {user.email}
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginTop: '4px' }}>
                        <FiLock size={10} /> Email cannot be changed
                      </span>
                    </div>
                  </div>
                  <button 
                    className="btn-icon" 
                    onClick={() => setIsEditing(true)}
                    title="Edit Profile"
                  >
                    <FiEdit2 />
                  </button>
                </div>
                
                <div className="settings-section">
                  <h3>ACCOUNT SETTINGS</h3>
                  <div className="settings-list">
                    <button 
                      className="settings-item" 
                      onClick={() => setIsEditing(true)}
                      disabled={isLoading}
                    >
                      <span>Edit Profile</span>
                      <span>→</span>
                    </button>
                    <button 
                      className="settings-item"
                      onClick={() => navigate('/forgot-password')}
                    >
                      <span>Change Password</span>
                      <span>→</span>
                    </button>
                    <button 
                      className="settings-item"
                      onClick={() => window.open('mailto:baninginc@gmail.com', '_blank')}
                    >
                      <span>Support</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
                
                <div className="settings-actions">
                  <button 
                    className="btn btn-secondary settings-action-btn"
                    onClick={handleLogout}
                    disabled={isLoading || isDeleting}
                  >
                    Logout
                  </button>
                  <button 
                    className="btn btn-danger settings-action-btn"
                    onClick={handleDeleteAccount}
                    disabled={isLoading || isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="settings-footer">
            <div className="footer-nav">
              <button onClick={() => navigate('/')}>Home</button>
              <button onClick={() => navigate('/messages')}>Messages</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Settings;