import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { FiUser, FiLock, FiBell, FiShield, FiHelpCircle } from 'react-icons/fi';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('account');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    bio: user.bio || '',
    username: user.username || ''
  });

  const handleSave = async () => {
    try {
      const response = await fetch('https://vesselx.onrender.com/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <div className="settings-section">
            <h3>Account Information</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="form-input"
                rows="4"
              />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        );
      
      case 'security':
        return (
          <div className="settings-section">
            <h3>Security</h3>
            <button className="btn btn-secondary">Change Password</button>
            <button className="btn btn-secondary">Two-Factor Authentication</button>
            <button className="btn btn-secondary">Login Activity</button>
          </div>
        );
      
      case 'privacy':
        return (
          <div className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-toggle">
              <span>Private Account</span>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-toggle">
              <span>Show Activity Status</span>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar user={user} />
      
      <main className="main-content">
        <div className="settings-layout">
          <div className="settings-sidebar">
            <button 
              className={`settings-nav ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSection('account')}
            >
              <FiUser size={20} />
              <span>Account</span>
            </button>
            
            <button 
              className={`settings-nav ${activeSection === 'security' ? 'active' : ''}`}
              onClick={() => setActiveSection('security')}
            >
              <FiLock size={20} />
              <span>Security</span>
            </button>
            
            <button 
              className={`settings-nav ${activeSection === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveSection('privacy')}
            >
              <FiShield size={20} />
              <span>Privacy</span>
            </button>
            
            <button 
              className={`settings-nav ${activeSection === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <FiBell size={20} />
              <span>Notifications</span>
            </button>
            
            <button 
              className={`settings-nav ${activeSection === 'help' ? 'active' : ''}`}
              onClick={() => setActiveSection('help')}
            >
              <FiHelpCircle size={20} />
              <span>Help</span>
            </button>
          </div>
          
          <div className="settings-content">
            {renderSection()}
          </div>
        </div>
      </main>
    </>
  );
};

export default Settings;