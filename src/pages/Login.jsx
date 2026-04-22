import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { showToast } from '../utils/toast';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'gabimarutechbot';

function VLogo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#5865f2"/>
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

function TelegramLoginButton({ botUsername, onAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }
    return () => { delete window.onTelegramAuth; };
  }, [botUsername, onAuth]);

  return <div ref={containerRef} className="flex justify-center" />;
}

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  const [telegramMode, setTelegramMode] = useState(null);
  const [phone, setPhone] = useState('');
  const [otpRequestId, setOtpRequestId] = useState(null);
  const [otpTelegramId, setOtpTelegramId] = useState(null);
  const [otp, setOtp] = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState('');

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

  const handleTelegramWidgetAuth = async (telegramUser) => {
    setTgError('');
    setTgLoading(true);
    try {
      const data = await API.telegramWidgetLogin(telegramUser);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate(data.isNewUser ? '/settings' : '/');
    } catch (err) {
      setTgError(err.message || 'Telegram login failed');
    } finally { setTgLoading(false); }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setTgError('');
    setTgLoading(true);
    try {
      const data = await API.telegramGatewaySend(phone);
      setOtpRequestId(data.request_id);
      setOtpTelegramId(data.telegram_id || null);
    } catch (err) {
      setTgError(err.message || 'Failed to send code');
    } finally { setTgLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setTgError('');
    setTgLoading(true);
    try {
      const data = await API.telegramGatewayVerify(otpRequestId, otp, phone, otpTelegramId);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate(data.isNewUser ? '/settings' : '/');
    } catch (err) {
      setTgError(err.message || 'Verification failed');
    } finally { setTgLoading(false); }
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

          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-discord-muted/30" />
              <span className="text-discord-muted text-xs uppercase tracking-wider">or continue with</span>
              <div className="flex-1 h-px bg-discord-muted/30" />
            </div>

            {!telegramMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => setTelegramMode('widget')}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                  </svg>
                  Telegram
                </button>
                <button
                  onClick={() => { setTelegramMode('gateway'); setOtpRequestId(null); setOtp(''); setPhone(''); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-discord-darker hover:bg-discord-darker/70 text-discord-muted hover:text-discord-text border border-discord-muted/20 font-semibold py-2.5 px-4 rounded-md transition-colors text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                  </svg>
                  Phone OTP
                </button>
              </div>
            )}

            {telegramMode === 'widget' && (
              <div className="space-y-3">
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
                {tgError && (
                  <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">
                    {tgError}
                  </div>
                )}
              </div>
            )}

            {telegramMode === 'gateway' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-discord-muted text-xs font-semibold uppercase tracking-wide">Phone OTP via Telegram</span>
                  <button onClick={() => { setTelegramMode(null); setTgError(''); setOtpRequestId(null); setOtpTelegramId(null); }} className="text-discord-muted hover:text-discord-text text-xs">Cancel</button>
                </div>
                {!otpRequestId ? (
                  <form onSubmit={handleSendOTP} className="space-y-3">
                    <div>
                      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+12025550123"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="discord-input w-full"
                        required
                      />
                      <p className="text-discord-muted text-xs mt-1">Include country code (e.g. +1, +44)</p>
                    </div>
                    {tgError && (
                      <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">
                        {tgError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={tgLoading}
                      className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm w-full disabled:opacity-50"
                    >
                      {tgLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : 'Send Code via Telegram'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-3">
                    <p className="text-discord-muted text-sm">A code was sent to your Telegram. Enter it below.</p>
                    <div>
                      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Verification Code</label>
                      <input
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        className="discord-input w-full text-center tracking-widest text-lg"
                        maxLength={8}
                        required
                        autoFocus
                      />
                    </div>
                    {tgError && (
                      <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">
                        {tgError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={tgLoading}
                      className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm w-full disabled:opacity-50"
                    >
                      {tgLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : 'Verify & Log In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpRequestId(null)}
                      className="text-discord-muted hover:text-discord-text text-xs w-full text-center"
                    >
                      Use a different number
                    </button>
                  </form>
                )}
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
