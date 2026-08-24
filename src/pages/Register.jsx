import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import {
  VLogo,
  PasswordField,
  TelegramLoginButton,
  TelegramIcon,
  TelegramPhoneOTP,
  ErrorBox,
  OrDivider,
} from '../components/AuthShared';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'vesselxoathbot';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirm: '', name: '', email: '' });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [telegramMode, setTelegramMode] = useState(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState('');

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), [form.email]);
  const usernameValid = useMemo(() => form.username.length >= 3 && form.username.length <= 32, [form.username]);
  const passwordsMatch = form.password && form.password === form.confirm;

  const canSubmit =
    form.name.trim().length > 0 &&
    emailValid &&
    usernameValid &&
    form.password.length >= 6 &&
    passwordsMatch &&
    agree &&
    !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (!emailValid) { setError('Please enter a valid email address'); return; }
    if (!usernameValid) { setError('Username must be 3–32 characters'); return; }
    if (!agree) { setError('Please accept the Terms of Service'); return; }

    setLoading(true);
    try {
      const { confirm, ...payload } = form;
      const data = await API.register(payload);
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const completeAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('authChange'));
    // New Telegram-created accounts go to Settings to finish setup; existing users land on home.
    navigate(data.isNewUser ? '/settings' : '/');
  };

  const handleTelegramWidgetAuth = async (telegramUser) => {
    setTgError('');
    setTgLoading(true);
    try {
      const data = await API.telegramWidgetLogin(telegramUser);
      completeAuth(data);
    } catch (err) {
      setTgError(err.message || 'Telegram sign-up failed');
    } finally { setTgLoading(false); }
  };

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-discord-sidebar rounded-lg p-8 shadow-2xl animate-fade-in">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <VLogo size={60} />
            </div>
            <h1 className="text-2xl font-bold text-discord-text mb-1">Create an account</h1>
            <p className="text-discord-muted text-sm">Join the community in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="discord-input w-full"
                required
                autoFocus
                autoComplete="name"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Email
                {form.email && !emailValid && (
                  <span className="text-discord-red normal-case font-normal ml-2">— invalid</span>
                )}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="discord-input w-full"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Username
                {form.username && !usernameValid && (
                  <span className="text-discord-red normal-case font-normal ml-2">— 3–32 characters</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted text-sm">@</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
                  className="discord-input w-full pl-7"
                  required
                  autoComplete="username"
                  maxLength={32}
                  spellCheck={false}
                />
              </div>
              <p className="text-discord-muted text-xs mt-1">Letters, numbers and underscores only.</p>
            </div>

            <PasswordField
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              label="Password"
              minLength={6}
              showStrength
            />

            <PasswordField
              value={form.confirm}
              onChange={(v) => setForm({ ...form, confirm: v })}
              label="Confirm Password"
              minLength={6}
              hint={form.confirm && !passwordsMatch ? null : null}
            />
            {form.confirm && !passwordsMatch && (
              <p className="text-discord-red text-xs -mt-2">Passwords do not match</p>
            )}

            <label className="flex items-start gap-2 text-discord-muted text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agree}
                onChange={e => setAgree(e.target.checked)}
                className="mt-0.5 accent-discord-brand"
              />
              <span>
                I agree to the{' '}
                <a href="#/terms" className="text-discord-brand hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#/privacy" className="text-discord-brand hover:underline">Privacy Policy</a>.
              </span>
            </label>

            <ErrorBox message={error} />

            <button
              type="submit"
              disabled={!canSubmit}
              className="discord-btn w-full py-3 text-base font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </div>
              ) : 'Continue'}
            </button>
          </form>

          <div className="mt-5">
            <OrDivider label="or sign up with" />

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
                  <span className="text-discord-muted text-xs font-semibold uppercase tracking-wide">Telegram Sign-Up</span>
                  <button onClick={() => { setTelegramMode(null); setTgError(''); }} className="text-discord-muted hover:text-discord-text text-xs">Cancel</button>
                </div>
                {tgLoading ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-[#229ED9] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <TelegramLoginButton botUsername={TELEGRAM_BOT_USERNAME} onAuth={handleTelegramWidgetAuth} />
                )}
                <p className="text-discord-muted text-xs text-center">
                  We'll create your account using your Telegram profile. No password needed.
                </p>
                <ErrorBox message={tgError} />
              </div>
            )}

            {telegramMode === 'gateway' && (
              <div className="animate-fade-in">
                <TelegramPhoneOTP
                  onCancel={() => setTelegramMode(null)}
                  onSuccess={completeAuth}
                  ctaLabel="Verify & Create Account"
                />
                <p className="text-discord-muted text-xs text-center mt-3">
                  If this number isn't registered yet, we'll create a new account for you.
                </p>
              </div>
            )}
          </div>

          <p className="text-center mt-5 text-discord-muted text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-discord-brand hover:underline font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
