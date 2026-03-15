import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiTrash2, FiLogOut, FiShield, FiZap } from 'react-icons/fi';
import Layout from '../components/Layout';
import API from '../utils/api';

export default function Settings({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [section, setSection] = useState('account');
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const pw = prompt('Enter your password to confirm account deletion:');
    if (!pw) return;
    if (!confirm('This action is permanent. Delete your account?')) return;
    try {
      await API.deleteAccount(pw);
      handleLogout();
    } catch (err) { alert(err.message); }
  };

  const SECTIONS = [
    { id: 'account', icon: FiUser, label: 'My Account' },
    { id: 'security', icon: FiShield, label: 'Security' },
    { id: 'supa', icon: FiZap, label: 'Supa Premium' },
  ];

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r border-discord-hover bg-discord-sidebar p-3 flex flex-col hidden md:flex">
          <p className="text-discord-muted text-xs font-bold uppercase px-2 py-1.5 mb-1">User Settings</p>
          {SECTIONS.map(s => (
            <button key={s.id} className={`nav-item mb-0.5 ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              <s.icon size={16} /> {s.label}
            </button>
          ))}
          <div className="mt-auto">
            <button className="nav-item text-discord-red hover:bg-discord-red/10 w-full" onClick={handleLogout}>
              <FiLogOut size={16} /> Log Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
          {section === 'account' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-6">My Account</h2>
              <div className="bg-discord-sidebar rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-discord-text">{currentUser?.name}</p>
                    <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-discord-sidebar rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Display Name</p>
                      <p className="text-discord-muted text-sm">{currentUser?.name}</p>
                    </div>
                    <button className="text-discord-brand text-sm hover:underline" onClick={() => navigate(`/profile/${currentUser?.username}`)}>Edit</button>
                  </div>
                </div>
                <div className="bg-discord-sidebar rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Username</p>
                      <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-discord-hover">
                <h3 className="text-discord-red font-semibold mb-4">Danger Zone</h3>
                <button className="flex items-center gap-2 text-discord-red hover:bg-discord-red/10 px-4 py-2 rounded-lg transition-colors text-sm font-semibold border border-discord-red/30" onClick={handleDeleteAccount}>
                  <FiTrash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-6">Security</h2>
              <div className="bg-discord-sidebar rounded-lg p-4">
                <p className="text-discord-text font-semibold mb-1">Change Password</p>
                <p className="text-discord-muted text-sm mb-4">To change your password, use the "Forgot Password" flow from the login page.</p>
                <button className="discord-btn text-sm px-4 py-2" onClick={() => { handleLogout(); }}>
                  Log out and reset password
                </button>
              </div>
            </div>
          )}

          {section === 'supa' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-2">Supa Premium</h2>
              <p className="text-discord-muted text-sm mb-6">Unlock exclusive features with Supa Premium.</p>
              <div className="bg-gradient-to-br from-discord-brand/20 to-purple-600/20 border border-discord-brand/30 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FiZap size={20} className="text-discord-brand" />
                  <span className="supa-badge text-sm px-3 py-1">SUPA PREMIUM</span>
                </div>
                <div className="space-y-3 mb-6">
                  {['Verified badge on your profile', 'Custom profile badge', 'Priority in search results', 'Exclusive reactions'].map(f => (
                    <div key={f} className="flex items-center gap-2 text-discord-text text-sm">
                      <span className="text-discord-green">✓</span> {f}
                    </div>
                  ))}
                </div>
                {currentUser?.isSupa ? (
                  <p className="text-discord-green font-semibold">✓ You have Supa Premium!</p>
                ) : (
                  <button className="discord-btn w-full py-2.5 font-semibold">Upgrade to Supa</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
