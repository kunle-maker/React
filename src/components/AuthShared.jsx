import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';

export function VLogo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vlogo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5865f2" />
          <stop offset="100%" stopColor="#7289da" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#vlogo-grad)" />
      <text x="50" y="72" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="62" textAnchor="middle" fill="white">V</text>
    </svg>
  );
}

export function TelegramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  );
}

function EyeIcon({ off, size = 18 }) {
  return off ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PasswordField({
  value,
  onChange,
  label = 'Password',
  required = true,
  minLength,
  autoFocus = false,
  showStrength = false,
  placeholder = '',
  hint = null,
}) {
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleKey = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLock(e.getModifierState('CapsLock'));
    }
  };

  const strength = scorePassword(value || '');

  return (
    <div>
      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          onKeyUp={handleKey}
          className="discord-input w-full pr-10"
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete={showStrength ? 'new-password' : 'current-password'}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-discord-muted hover:text-discord-text p-1.5 rounded transition-colors"
        >
          <EyeIcon off={show} />
        </button>
      </div>
      {capsLock && (
        <p className="text-discord-yellow text-xs mt-1 flex items-center gap-1">
          <span>⚠</span> Caps Lock is on
        </p>
      )}
      {showStrength && value && (
        <div className="mt-2">
          <div className="h-1 bg-discord-darker rounded overflow-hidden flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`flex-1 transition-colors ${i < strength.score ? strength.color : 'bg-discord-darker'}`}
              />
            ))}
          </div>
          <p className={`text-xs mt-1 ${strength.textColor}`}>{strength.label}</p>
        </div>
      )}
      {hint && <p className="text-discord-muted text-xs mt-1">{hint}</p>}
    </div>
  );
}

function scorePassword(pwd) {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: 'Too short', color: 'bg-discord-red', textColor: 'text-discord-red' },
    { label: 'Weak', color: 'bg-discord-red', textColor: 'text-discord-red' },
    { label: 'Fair', color: 'bg-discord-yellow', textColor: 'text-discord-yellow' },
    { label: 'Good', color: 'bg-discord-brand', textColor: 'text-discord-brand' },
    { label: 'Strong', color: 'bg-discord-green', textColor: 'text-discord-green' },
  ];
  return { score, ...map[score] };
}

export function TelegramLoginButton({ botUsername, onAuth }) {
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

export function Spinner({ size = 4, color = 'white' }) {
  return (
    <div
      className={`w-${size} h-${size} border-2 border-${color} border-t-transparent rounded-full animate-spin`}
    />
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="bg-discord-red/10 border border-discord-red/30 rounded p-3 text-discord-red text-sm">
      {message}
    </div>
  );
}

export function OrDivider({ label = 'or continue with' }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-discord-muted/30" />
      <span className="text-discord-muted text-xs uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-discord-muted/30" />
    </div>
  );
}

/**
 * Self-contained Telegram phone OTP flow.
 * onSuccess(data) is called when verification succeeds with the API response.
 */
export function TelegramPhoneOTP({ onCancel, onSuccess, ctaLabel = 'Verify & Continue' }) {
  const [phone, setPhone] = useState('');
  const [otpRequestId, setOtpRequestId] = useState(null);
  const [otpTelegramId, setOtpTelegramId] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await API.telegramGatewaySend(phone);
      setOtpRequestId(data.request_id);
      setOtpTelegramId(data.telegram_id || null);
      setResendIn(45);
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally { setLoading(false); }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await API.telegramGatewayVerify(otpRequestId, otp, phone, otpTelegramId);
      onSuccess(data);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-discord-muted text-xs font-semibold uppercase tracking-wide">Phone OTP via Telegram</span>
        {onCancel && (
          <button onClick={onCancel} className="text-discord-muted hover:text-discord-text text-xs">Cancel</button>
        )}
      </div>
      {!otpRequestId ? (
        <form onSubmit={sendCode} className="space-y-3">
          <div>
            <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Phone Number</label>
            <input
              type="tel"
              placeholder="+12025550123"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="discord-input w-full"
              required
              autoFocus
            />
            <p className="text-discord-muted text-xs mt-1">Include country code (e.g. +1, +44). You'll receive the code in Telegram.</p>
          </div>
          <ErrorBox message={error} />
          <button
            type="submit"
            disabled={loading || !phone}
            className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm w-full disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Code via Telegram'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-discord-muted text-sm">
            A code was sent to your Telegram for <span className="text-discord-text font-medium">{phone}</span>. Enter it below.
          </p>
          <div>
            <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="discord-input w-full text-center tracking-widest text-lg"
              maxLength={8}
              required
              autoFocus
            />
          </div>
          <ErrorBox message={error} />
          <button
            type="submit"
            disabled={loading || otp.length < 4}
            className="flex items-center justify-center gap-2 bg-[#229ED9] hover:bg-[#1a8bbf] text-white font-semibold py-2.5 px-4 rounded-md transition-colors text-sm w-full disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : ctaLabel}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => { setOtpRequestId(null); setOtp(''); setError(''); }}
              className="text-discord-muted hover:text-discord-text"
            >
              Use a different number
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={() => sendCode()}
              className="text-discord-brand hover:underline disabled:text-discord-muted disabled:no-underline"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
