import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { showToast } from '../utils/toast';
import {
  VLogo,
  PasswordField,
  TelegramLoginButton,
  TelegramIcon,
  TelegramPhoneOTP,
  ErrorBox,
  OrDivider,
} from '../components/AuthShared';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'gabimarutechbot';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  const [telegramMode, setTelegramMode] = useState(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await API.login(form.username.trim(), form.password);
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

  const completeAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('authChange'));
    navigate(data.isNewUser ? '/settings' : '/');
  };

  const handleTelegramWidgetAuth = async (telegramUser) => {
    setTgError('');
    setTgLoading(true);
    try {
      const data = await API.telegramWidgetLogin(telegramUser);
      completeAuth(data);
    } catch (err) {
      setTgError(err.message || 'Telegram login failed');
    } finally { setTgLoading(false); }
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
        <div className="bg-discord-sidebar rounded-lg p-8 w-full max-w-md text-center animate-fade-in">
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
              try { await API.resendVerification(verifyEmail); showToast('Verification email resent!', { type: 'success' }); }
              catch { showToast('Failed to resend', { type: 'error' }); }
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
        <div className="bg-discord-sidebar rounded-lg p-8 shadow-2xl animate-fade-in">
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
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="discord-input w-full"
                required
                autoFocus
                autoComplete="username"
                spellCheck={false}
              />
            </div>
            <PasswordField
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              label="Password"
            />
            <div className="text-right -mt-2">
              <Link to="/forgot-password" className="text-discord-brand text-xs hover:underline">
                Forgot your password?
              </Link>
            </div>
            <ErrorBox message={error} />
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

          <div className="mt-5">
            <OrDivider />

            {!telegramMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTelegramMode('widget')}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm"
                >
                  <TelegramIcon />
                  Telegram
                </button>
                <button
                  onClick={() => setTelegramMode('gateway')}
                  className="flex-1 flex items-center justify-center gap-2 bg-discord-darker hover:bg-discord-darker/70 text-discord-muted hover:text-discord-text border border-discord-muted/20 font-semibold py-2.5 px-4 rounded-md transition-colors text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                  </svg>
                  Phone OTP
                </button>
              </div>
            )}

            {telegramMode === 'widget' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-discord-muted text-xs font-semibold uppercase tracking-wide">Telegram Login</span>
                  <button onClick={() => { setTelegramMode(null); setTgError(''); }} className="text-discord-muted hover:text-discord-text text-xs">Cancel</button>
                </div>
                {tgLoading ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-[#229ED9] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <TelegramLoginButton botUsername={TELEGRAM_BOT_USERNAME} onAuth={handleTelegramWidgetAuth} />
                )}
                <ErrorBox message={tgError} />
              </div>
            )}

            {telegramMode === 'gateway' && (
              <div className="animate-fade-in">
                <TelegramPhoneOTP
                  onCancel={() => setTelegramMode(null)}
                  onSuccess={completeAuth}
                  ctaLabel="Verify & Log In"
                />
              </div>
            )}
          </div>

          <p className="text-center mt-5 text-discord-muted text-sm">
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
