import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';

function VLogo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#5865f2"/>
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await API.register(form);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-discord-sidebar rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <VLogo size={60} />
            </div>
            <h1 className="text-2xl font-bold text-discord-text mb-1">Create an account</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Display Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="discord-input w-full" required autoFocus />
            </div>
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="discord-input w-full" required />
            </div>
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} className="discord-input w-full" required />
            </div>
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="discord-input w-full" required minLength={6} />
            </div>
            {error && (
              <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">{error}</div>
            )}
            <button type="submit" disabled={loading} className="discord-btn w-full py-3 text-base font-semibold rounded-md disabled:opacity-50">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : 'Continue'}
            </button>
          </form>
          <p className="text-center mt-4 text-discord-muted text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-discord-brand hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
