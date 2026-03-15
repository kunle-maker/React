import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.forgotPassword(email);
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="bg-discord-sidebar rounded-lg p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-discord-text mb-2">Reset your password</h1>
          <p className="text-discord-muted text-sm">Enter your email and we'll send a reset link.</p>
        </div>
        {sent ? (
          <div className="text-center">
            <div className="bg-discord-green/10 border border-discord-green/30 rounded p-4 text-discord-green mb-4">
              Check your email (including spam) for a reset link!
            </div>
            <Link to="/login" className="text-discord-brand hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="discord-input w-full" required autoFocus />
            </div>
            {error && <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="discord-btn w-full py-3 font-semibold disabled:opacity-50">
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-discord-brand text-sm hover:underline">Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
