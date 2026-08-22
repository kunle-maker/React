import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await API.verifyEmailCode(email, code);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('authChange'));
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    try {
      await API.resendVerification(email);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="bg-discord-sidebar rounded-lg p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📧</div>
          <h1 className="text-2xl font-bold text-discord-text mb-2">Check your email</h1>
          <p className="text-discord-muted text-sm">We've sent a 6-digit verification code to your email.</p>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          {!email && (
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="discord-input w-full" required />
            </div>
          )}
          <div>
            <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="discord-input w-full text-center text-2xl tracking-widest font-bold"
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
          </div>
          {error && <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">{error}</div>}
          {resent && <div className="bg-discord-green/10 border border-discord-green/30 rounded p-3 text-discord-green text-sm">Email resent! Check your inbox (and spam).</div>}
          <button type="submit" disabled={loading || code.length !== 6} className="discord-btn w-full py-3 font-semibold disabled:opacity-50">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : 'Verify Email'}
          </button>
          <button type="button" onClick={handleResend} className="w-full text-center text-discord-brand text-sm hover:underline">
            Didn't get the code? Resend
          </button>
        </form>
      </div>
    </div>
  );
}
