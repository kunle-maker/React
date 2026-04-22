import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiCheck, FiArrowLeft, FiKey, FiEye, FiEyeOff } from 'react-icons/fi';
import API from '../utils/api';

function VLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#5865f2" />
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

function CodeInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs[i + 1].current?.focus();
    if (next.every(d => d !== '')) onComplete(next.join(''));
    else onComplete('');
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) refs[i - 1].current?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      refs[5].current?.focus();
      onComplete(pasted);
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center my-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white/4 text-white outline-none transition-all
            ${d ? 'border-discord-brand bg-discord-brand/10' : 'border-white/10'}
            focus:border-discord-brand focus:bg-discord-brand/8 focus:shadow-lg focus:shadow-discord-brand/20`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [deliveredVia, setDeliveredVia] = useState('email');
  const [usesTelegram, setUsesTelegram] = useState(false);

  const [resetMode, setResetMode] = useState(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUsesTelegram(false);
    try {
      const data = await API.forgotPassword(email);
      setDeliveredVia(data?.deliveredVia || 'email');
      setSent(true);
    } catch (err) {
      const raw = err?.raw || {};
      if (raw.usesTelegramLogin || /telegram login/i.test(err.message || '')) {
        setUsesTelegram(true);
        setError(err.message || 'This account uses Telegram login. Please use the Telegram button to sign in.');
      } else {
        setError(err.message || 'Failed to send reset code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeReset = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { setResetError('Please enter the full 6-digit code.'); return; }
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetting(true);
    setResetError('');
    try {
      await API.resetPassword({ code, password: newPassword });
      setResetSuccess(true);
    } catch (err) {
      setResetError(err.message || 'Invalid code or code has expired.');
    } finally {
      setResetting(false);
    }
  };

  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
        <div className="bg-discord-sidebar rounded-2xl p-8 w-full max-w-md shadow-2xl text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <FiCheck size={28} className="text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-discord-text mb-2">Password Reset!</h2>
          <p className="text-discord-muted text-sm mb-6">Your password has been updated successfully. You can now log in with your new password.</p>
          <button className="discord-btn w-full py-3 font-semibold" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (resetMode === 'code') {
    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
        <div className="bg-discord-sidebar rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in">
          <button
            onClick={() => { setResetMode(null); setResetError(''); setCode(''); setNewPassword(''); }}
            className="flex items-center gap-2 text-discord-muted hover:text-discord-text text-sm mb-6 transition-colors"
          >
            <FiArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-discord-brand/15 flex items-center justify-center mx-auto mb-4">
              <FiKey size={24} className="text-discord-brand" />
            </div>
            <h2 className="text-2xl font-bold text-discord-text mb-1">Enter Reset Code</h2>
            <p className="text-discord-muted text-sm">Enter the 6-digit code from your email and choose a new password.</p>
          </div>

          <form onSubmit={handleCodeReset} className="space-y-5">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-2">6-Digit Code</label>
              <CodeInput onComplete={setCode} />
              <p className="text-discord-muted text-xs text-center mt-1">Check the large display box in your email</p>
            </div>

            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="discord-input w-full pr-10"
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text transition-colors"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {resetError && (
              <div className="bg-discord-red/10 border border-discord-red/30 rounded-lg p-3 text-discord-red text-sm">
                {resetError}
              </div>
            )}

            <button
              type="submit"
              disabled={resetting || code.length !== 6 || !newPassword}
              className="discord-btn w-full py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resetting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><FiLock size={14} /> Reset Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (sent) {
    const channelLabel = deliveredVia === 'telegram_bot'
      ? 'Telegram chat with the bot'
      : deliveredVia === 'telegram_gateway'
        ? 'Telegram (via phone)'
        : 'inbox';
    const channelHelper = deliveredVia === 'telegram_bot'
      ? 'Open your Telegram chat with the bot to find the 6-digit code.'
      : deliveredVia === 'telegram_gateway'
        ? 'Telegram sent the 6-digit code as a verification message.'
        : 'We sent a reset link and a 6-digit code to your email. Check your spam folder too.';

    return (
      <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
        <div className="bg-discord-sidebar rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-discord-brand/15 flex items-center justify-center mx-auto mb-4">
              <FiMail size={24} className="text-discord-brand" />
            </div>
            <h2 className="text-2xl font-bold text-discord-text mb-2">Check your {channelLabel}</h2>
            <p className="text-discord-muted text-sm">
              For <span className="text-discord-text font-semibold">{email}</span> — {channelHelper}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-discord-muted text-xs font-bold uppercase tracking-wide text-center mb-4">How would you like to reset?</p>

            {deliveredVia === 'email' && (
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/8 hover:border-discord-brand/40 hover:bg-discord-brand/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-discord-brand/15 flex items-center justify-center flex-shrink-0 group-hover:bg-discord-brand/25 transition-colors">
                  <FiMail size={18} className="text-discord-brand" />
                </div>
                <div>
                  <p className="text-discord-text font-semibold text-sm">I'll click the link in my email</p>
                  <p className="text-discord-muted text-xs">Open the email and click the reset link</p>
                </div>
              </button>
            )}

            <button
              onClick={() => setResetMode('code')}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/8 hover:border-discord-brand/40 hover:bg-discord-brand/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
                <FiKey size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-discord-text font-semibold text-sm">Enter the 6-digit code</p>
                <p className="text-discord-muted text-xs">Type the code shown in your email manually</p>
              </div>
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-discord-brand text-sm hover:underline">Back to login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-discord-sidebar rounded-2xl p-8 shadow-2xl animate-fade-in">
          <div className="text-center mb-7">
            <div className="flex justify-center mb-4">
              <VLogo size={48} />
            </div>
            <h1 className="text-2xl font-bold text-discord-text mb-2">Reset your password</h1>
            <p className="text-discord-muted text-sm">Enter your email or username — we'll send a 6-digit code through whichever channel you signed up with.</p>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">
                Email or Username
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="discord-input w-full"
                placeholder="your@email.com or yourusername"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className={`${usesTelegram ? 'bg-[#229ED9]/10 border-[#229ED9]/30 text-[#229ED9]' : 'bg-discord-red/10 border-discord-red/30 text-discord-red'} border rounded-lg p-3 text-sm`}>
                {error}
                {usesTelegram && (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="block mt-2 underline font-semibold"
                  >
                    Go to Telegram login
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="discord-btn w-full py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><FiMail size={14} /> Send Reset Email</>
              )}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-discord-brand text-sm hover:underline flex items-center justify-center gap-1">
                <FiArrowLeft size={13} /> Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
