import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiUser, FiCheck, FiX, FiClock, FiSearch, FiArrowLeft } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import { SupaBadge } from '../components/UserBadge';
import API from '../utils/api';

const DURATION_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '180 days', value: 180 },
  { label: '365 days', value: 365 },
  { label: 'Lifetime (9999d)', value: 9999 },
];

export default function AdminPanel({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(null);
  const [supaUsers, setSupaUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [grantUsername, setGrantUsername] = useState('');
  const [grantDuration, setGrantDuration] = useState(30);
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantResult, setGrantResult] = useState(null);
  const [revokeUsername, setRevokeUsername] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeResult, setRevokeResult] = useState(null);
  const [activeTab, setActiveTab] = useState('grant');

  useEffect(() => {
    checkAdmin();
  }, [currentUser]);

  const checkAdmin = async () => {
    try {
      const data = await API.getSupaUsers();
      setAuthorized(true);
      setSupaUsers(data.users || []);
    } catch (err) {
      if (err.message?.includes('403') || err.message?.includes('Admin')) {
        setAuthorized(false);
      } else {
        setAuthorized(false);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantUsername.trim()) return;
    setGrantLoading(true);
    setGrantResult(null);
    try {
      const data = await API.grantSupa(grantUsername.trim(), grantDuration);
      setGrantResult({ success: true, message: data.message || `Supa granted to @${grantUsername}` });
      setGrantUsername('');
      checkAdmin();
    } catch (err) {
      setGrantResult({ success: false, message: err.message || 'Failed to grant Supa' });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (username) => {
    const target = username || revokeUsername.trim();
    if (!target) return;
    setRevokeLoading(true);
    setRevokeResult(null);
    try {
      const data = await API.revokeSupa(target);
      setRevokeResult({ success: true, message: data.message || `Supa revoked from @${target}` });
      setRevokeUsername('');
      checkAdmin();
    } catch (err) {
      setRevokeResult({ success: false, message: err.message || 'Failed to revoke Supa' });
    } finally {
      setRevokeLoading(false);
    }
  };

  if (authorized === null) {
    return (
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (authorized === false) {
    return (
      <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 px-4 text-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <FiShield size={28} className="text-red-400" />
          </div>
          <p className="text-discord-text font-semibold text-lg">Access Denied</p>
          <p className="text-discord-muted text-sm">You don't have permission to view this page.</p>
          <button className="discord-btn px-4 py-2 rounded-lg text-sm" onClick={() => navigate('/')}>
            Back to feed
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto">
        <div className="sticky top-0 z-10 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-4 py-3 flex items-center gap-3">
          <button className="text-discord-muted hover:text-discord-text transition-colors" onClick={() => navigate(-1)}>
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <FiShield size={18} className="text-discord-brand" />
            <h1 className="font-bold text-discord-text">Admin Panel</h1>
          </div>
          <span className="ml-auto text-xs bg-discord-brand/20 text-discord-brand px-2 py-0.5 rounded-full font-medium">
            {supaUsers.length} Active Supa
          </span>
        </div>

        <div className="flex border-b border-discord-hover">
          {['grant', 'revoke', 'users'].map(tab => (
            <button
              key={tab}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-discord-brand text-discord-brand'
                  : 'border-transparent text-discord-muted hover:text-discord-text'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'grant' ? 'Grant Supa' : tab === 'revoke' ? 'Revoke Supa' : 'Supa Users'}
            </button>
          ))}
        </div>

        <div className="px-4 py-5">
          {activeTab === 'grant' && (
            <div className="space-y-4">
              <p className="text-discord-muted text-sm">Grant Supa status to a user. They'll get verification, HD uploads, priority feed, and all premium features.</p>
              <form onSubmit={handleGrant} className="space-y-3">
                <div>
                  <label className="text-discord-text text-xs font-semibold mb-1.5 block uppercase tracking-wide">Username</label>
                  <div className="flex items-center gap-2 bg-discord-dark border border-discord-hover rounded-lg px-3 py-2.5 focus-within:border-discord-brand transition-colors">
                    <span className="text-discord-muted text-sm">@</span>
                    <input
                      type="text"
                      value={grantUsername}
                      onChange={e => setGrantUsername(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent text-discord-text text-sm outline-none placeholder-discord-muted"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-discord-text text-xs font-semibold mb-1.5 block uppercase tracking-wide">Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                          grantDuration === opt.value
                            ? 'bg-discord-brand border-discord-brand text-white'
                            : 'border-discord-hover text-discord-muted hover:border-discord-brand hover:text-discord-brand'
                        }`}
                        onClick={() => setGrantDuration(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {grantResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${grantResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {grantResult.success ? <FiCheck size={14} /> : <FiX size={14} />}
                    {grantResult.message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={grantLoading || !grantUsername.trim()}
                  className="w-full discord-btn py-3 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {grantLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiShield size={15} />
                  )}
                  {grantLoading ? 'Granting...' : 'Grant Supa'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'revoke' && (
            <div className="space-y-4">
              <p className="text-discord-muted text-sm">Revoke Supa status from a user. This removes all Supa features immediately.</p>
              <div>
                <label className="text-discord-text text-xs font-semibold mb-1.5 block uppercase tracking-wide">Username</label>
                <div className="flex items-center gap-2 bg-discord-dark border border-discord-hover rounded-lg px-3 py-2.5 focus-within:border-red-500/60 transition-colors">
                  <span className="text-discord-muted text-sm">@</span>
                  <input
                    type="text"
                    value={revokeUsername}
                    onChange={e => setRevokeUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent text-discord-text text-sm outline-none placeholder-discord-muted"
                  />
                </div>
              </div>
              {revokeResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${revokeResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {revokeResult.success ? <FiCheck size={14} /> : <FiX size={14} />}
                  {revokeResult.message}
                </div>
              )}
              <button
                type="button"
                disabled={revokeLoading || !revokeUsername.trim()}
                className="w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                onClick={() => handleRevoke(revokeUsername)}
              >
                {revokeLoading ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FiX size={15} />
                )}
                {revokeLoading ? 'Revoking...' : 'Revoke Supa'}
              </button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-3">
              {loadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : supaUsers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-discord-muted text-sm">No active Supa users.</p>
                </div>
              ) : (
                supaUsers.map(u => (
                  <div key={u._id} className="flex items-center gap-3 p-3 bg-discord-dark rounded-xl border border-discord-hover">
                    <Avatar user={u} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-discord-text text-sm truncate">{u.name || u.username}</span>
                        <SupaBadge size={13} username={u.username} />
                      </div>
                      <span className="text-discord-muted text-xs">@{u.username}</span>
                      {u.supaExpiresAt && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <FiClock size={10} className="text-discord-muted" />
                          <span className="text-discord-muted text-xs">
                            Expires {formatDistanceToNow(new Date(u.supaExpiresAt), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-xs font-medium flex items-center gap-1"
                      onClick={() => handleRevoke(u.username)}
                    >
                      <FiX size={13} />
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
