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

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await API.login(form.username, form.password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate('/');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('not verified') || msg.includes('requiresVerification')) {
        setNeedsVerification(true);
        setVerifyEmail(form.username);
      } else {
        setError(msg || 'Login failed');
      }
    } finally { setLoading(false); }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
        <div className="bg-discord-sidebar rounded-lg p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-discord-text mb-2">Verify your email</h2>
          <p className="text-discord-muted mb-6">Check your inbox and enter the code to activate your account.</p>
          <button
            className="discord-btn w-full mb-3"
            onClick={() => navigate('/verify-email', { state: { email: verifyEmail } })}
          >
            Enter verification code
          </button>
          <button
            className="text-discord-brand text-sm hover:underline"
            onClick={async () => {
              try { await API.resendVerification(verifyEmail); alert('Verification email resent!'); }
              catch { alert('Failed to resend'); }
            }}
          >
            Resend email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-discord-sidebar rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <VLogo size={60} />
            </div>
            <h1 className="text-2xl font-bold text-discord-text mb-1">Welcome back!</h1>
            <p className="text-discord-muted text-sm">We're so excited to see you again!</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Username Only
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="discord-input w-full"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="discord-input w-full"
                required
              />
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-discord-brand text-xs hover:underline">
                  Forgot your password?
                </Link>
              </div>
            </div>
            {error && (
              <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="discord-btn w-full py-3 text-base font-semibold rounded-md disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </div>
              ) : 'Log In'}
            </button>
          </form>

          <p className="text-center mt-4 text-discord-muted text-sm">
            Need an account?{' '}
            <Link to="/register" className="text-discord-brand hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
