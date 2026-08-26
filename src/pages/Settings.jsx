import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiLock, FiTrash2, FiLogOut, FiShield, FiZap,
  FiChevronRight, FiCheck, FiX, FiClock, FiCopy, FiGlobe,
  FiRefreshCw, FiAlertCircle, FiBell, FiChevronDown,
  FiLink, FiExternalLink, FiBarChart2, FiPlus, FiEye, FiUsers, FiTrendingUp,
  FiHelpCircle, FiMessageSquare, FiStar, FiSend
} from 'react-icons/fi';import { HiSparkles } from 'react-icons/hi';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import { SupaBadge, VerifiedBadge } from '../components/UserBadge';
import API from '../utils/api';
import { showToast } from '../utils/toast';
import { useI18n } from '../contexts/I18nContext';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-discord-brand/10 text-discord-brand border border-discord-brand/20 hover:bg-discord-brand/20'
      }`}
    >
      {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
      {copied ? 'Copied!' : (label || 'Copy')}
    </button>
  );
}

function AccountCard({ label, value }) {
  return (
    <div className="bg-white/3 rounded-xl p-3.5 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-discord-muted text-xs font-semibold uppercase tracking-wide mb-0.5">{label}</p>
          <p className="text-discord-text font-mono text-sm font-bold">{value}</p>
        </div>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

function BankTransferScreen({ paymentData, plan, onActivated, onBack }) {
  const [polling, setPolling] = useState(true);
  const [activated, setActivated] = useState(false);
  const [selectedBank, setSelectedBank] = useState(0);
  const intervalRef = useRef(null);

  const accounts = paymentData?.payment?.allAccounts?.length
    ? paymentData.payment.allAccounts
    : paymentData?.payment
      ? [paymentData.payment]
      : [];

  const currentAccount = accounts[selectedBank] || {};
  const amount = paymentData?.amount;
  const currency = paymentData?.currency || 'NGN';
  const amountStr = amount ? `${currency === 'NGN' ? '₦' : currency}${Number(amount).toLocaleString()}` : '';

  useEffect(() => {
    if (!polling) return;
    intervalRef.current = setInterval(async () => {
      try {
        const data = await API.getSupaStatus();
        if (data?.isSupa) {
          clearInterval(intervalRef.current);
          setPolling(false);
          setActivated(true);
          setTimeout(() => onActivated(data), 1200);
        }
      } catch { }
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [polling, onActivated]);

  if (activated) {
    return (
      <div className="text-center py-12 px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/10">
          <FiCheck size={36} className="text-green-400" />
        </div>
        <h3 className="font-black text-discord-text text-2xl mb-2">You're Supa! 🎉</h3>
        <p className="text-discord-muted text-sm">Your subscription is now active. Enjoy the full VesselX experience.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="text-discord-muted hover:text-discord-text transition-colors p-1 rounded-lg hover:bg-white/5">
          <FiX size={18} />
        </button>
        <div>
          <h3 className="font-bold text-discord-text">Bank Transfer</h3>
          <p className="text-discord-muted text-xs">Transfer to activate your {plan} plan</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-discord-brand/20 via-purple-500/10 to-pink-500/10 border border-discord-brand/30 rounded-2xl p-5 mb-4 shadow-lg">
        <p className="text-discord-muted text-xs font-bold uppercase tracking-wider mb-2">Transfer exactly</p>
        <p className="text-4xl font-black text-white mb-1">{amountStr}</p>
        <p className="text-discord-muted text-sm">to activate your Supa subscription</p>
      </div>

      {accounts.length > 1 && (
        <div className="mb-4">
          <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-2">Choose your bank</p>
          <div className="flex gap-2 flex-wrap">
            {accounts.map((acc, i) => (
              <button
                key={i}
                onClick={() => setSelectedBank(i)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  selectedBank === i
                    ? 'bg-discord-brand text-white border-discord-brand shadow-md shadow-discord-brand/30'
                    : 'bg-white/3 text-discord-muted border-white/8 hover:border-white/15 hover:text-discord-text'
                }`}
              >
                {acc.bankName || `Bank ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5 mb-5">
        <AccountCard label="Bank" value={currentAccount.bankName || '—'} />
        <AccountCard label="Account Number" value={currentAccount.accountNumber || '—'} />
        <AccountCard label="Account Name" value={currentAccount.accountName || '—'} />
      </div>

      {paymentData?.instructions && (
        <div className="bg-white/3 rounded-xl p-4 mb-5 border border-white/5">
          <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-3">How to pay</p>
          <div className="space-y-2">
            {paymentData.instructions.map((step, i) => (
              <p key={i} className="text-discord-text text-sm leading-relaxed">{step}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-green-500/8 border border-green-500/20 rounded-xl p-3.5">
        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <FiRefreshCw size={14} className="text-green-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div>
          <p className="text-green-400 text-sm font-semibold">Checking for payment...</p>
          <p className="text-green-400/60 text-xs">Supa activates automatically after transfer is received</p>
        </div>
      </div>
    </div>
  );
}

function SupaSection({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [paymentData, setPaymentData] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [initiateError, setInitiateError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('plans');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [existingAccount, setExistingAccount] = useState(null);
  const [trial, setTrial] = useState(null); // { available, daysLeft }
  const [supaTier, setSupaTier] = useState(null); // 'full' | 'lite' | null
  const [supaFeatures, setSupaFeatures] = useState(null); // { canBoostThisWeek, ... }
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    API.getSupaPlans().then(data => {
      const list = Array.isArray(data) ? data : data.plans || [];
      setPlans(list);
      if (list.length) setSelectedPlan(list[0].id || list[0].plan || 'monthly');
      // trial object may come with plans response
      if (data?.trial) setTrial(data.trial);
    }).catch(() => {
      setPlans([
        { id: 'monthly', label: 'Monthly', price: '₦1,100', period: '/month' },
        { id: 'yearly', label: 'Yearly', price: '₦12,000', period: '/year', badge: 'Save 9%' },
      ]);
    });

    // Load status for supaTier
    API.getSupaStatus().then(data => {
      if (data?.supaTier) setSupaTier(data.supaTier);
      if (data?.trial) setTrial(data.trial);
    }).catch(() => {});

    // Load features for canBoostThisWeek
    API.getSupaFeatures().then(data => {
      setSupaFeatures(data);
    }).catch(() => {});

    API.getSupaPaymentAccount().then(data => {
      if (data?.accountNumber || data?.payment?.accountNumber) {
        setExistingAccount(data?.payment || data);
      }
    }).catch(() => { });
  }, []);

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setInitiateError('');
    try {
      const data = await API.startSupaTrial();
      // Trial activates immediately — no redirect
      const tier = data.tier || 'full';
      const updated = { ...currentUser, isSupa: true, supaTier: tier };
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
      setTrial(prev => ({ ...prev, available: false }));
      setSupaTier(tier);
      // Refresh supa status to get accurate expiry/state
      API.getSupaStatus().then(status => {
        if (status?.supaTier) setSupaTier(status.supaTier);
      }).catch(() => {});
      const msg = data.message || `Free trial activated! ${data.daysRemaining ? `${data.daysRemaining} days remaining.` : ''}`;
      showToast(msg, { type: 'success' });
    } catch (err) {
      setInitiateError(err.message || 'Failed to start trial. Try again.');
    } finally { setTrialLoading(false); }
  };

  const loadHistory = async () => {
    if (historyTab === 'history' && history.length === 0) {
      setLoadingHistory(true);
      try {
        const data = await API.getSupaPaymentHistory();
        setHistory(Array.isArray(data) ? data : data.payments || []);
      } catch { }
      finally { setLoadingHistory(false); }
    }
  };

  useEffect(() => { loadHistory(); }, [historyTab]);

  const handleInitiate = async () => {
    setInitiating(true);
    setInitiateError('');
    try {
      const data = await API.initiateSupaPayment(selectedPlan);
      if (data.paymentLink) {
        window.location.href = data.paymentLink;
      } else {
        setInitiateError('No payment link returned. Please try again.');
      }
    } catch (err) {
      setInitiateError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setInitiating(false);
    }
  };

  const handleActivated = (statusData) => {
    setShowTransfer(false);
    setPaymentData(null);
    const updated = { ...currentUser, isSupa: true };
    localStorage.setItem('user', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
  };

  const FEATURES = [
    'Animated profile ring',
    'Verified SUPA badge',
    'Custom profile badge',
    'Priority in search results',
    'Exclusive reactions & emoji sets',
    'Extended video uploads',
    'Ad-free experience',
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <HiSparkles size={22} className="text-discord-brand" />
        <h2 className="text-xl font-bold text-discord-text">Supa Premium</h2>
      </div>
      <p className="text-discord-muted text-sm mb-5">Unlock the full VesselX experience.</p>

      {currentUser?.isSupa && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FiCheck size={16} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 text-sm font-semibold">
                Supa {supaTier === 'full' ? 'Full' : supaTier === 'lite' ? 'Lite' : ''} is active!
              </p>
              {supaTier === 'lite' && <p className="text-green-400/60 text-xs">Upgrade to Full for all features</p>}
            </div>
          </div>
          {/* Boost button — only when canBoostThisWeek — endpoint TBD */}
          {supaFeatures?.canBoostThisWeek && (
            <span className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full">
              🚀 Boost available
            </span>
          )}
        </div>
      )}

      {/* Free trial banner — only for non-Supa users when trial is available */}
      {!currentUser?.isSupa && trial?.available && (
        <div className="bg-discord-brand/10 border border-discord-brand/30 rounded-xl p-4 mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-discord-brand font-bold text-sm">🎁 Free Trial Available</p>
              <p className="text-discord-muted text-xs mt-0.5">
                Try Supa free{trial.daysLeft ? ` for ${trial.daysLeft} days` : ''} — no card required
              </p>
            </div>
            <button
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="flex-shrink-0 discord-btn px-4 py-2 text-sm font-bold rounded-xl disabled:opacity-50"
            >
              {trialLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Start Free Trial'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-5 bg-discord-hover rounded-xl p-1">
        {['plans', 'history'].map(t => (
          <button key={t} onClick={() => setHistoryTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${historyTab === t ? 'bg-discord-sidebar text-discord-text shadow' : 'text-discord-muted'}`}>
            {t === 'plans' ? 'Plans' : 'Billing History'}
          </button>
        ))}
      </div>

      {historyTab === 'plans' ? (
        <>
          <div className="space-y-3 mb-5">
            {plans.map(plan => {
              const pid = plan.id || plan.plan;
              const active = selectedPlan === pid;
              return (
                <div
                  key={pid}
                  onClick={() => setSelectedPlan(pid)}
                  className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${active ? 'border-discord-brand bg-discord-brand/5' : 'border-discord-hover bg-discord-sidebar hover:border-discord-hover/80'}`}
                >
                  {plan.badge && (
                    <span className="absolute top-3 right-3 bg-discord-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{plan.badge}</span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? 'border-discord-brand bg-discord-brand' : 'border-discord-muted'}`}>
                      {active && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
                    </div>
                    <span className="font-bold text-discord-text">{plan.label || pid}</span>
                  </div>
                  <p className="text-2xl font-black text-discord-text ml-6">
                    {plan.price} <span className="text-sm font-normal text-discord-muted">{plan.period}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-discord-sidebar rounded-xl p-4 mb-5">
            <p className="text-discord-muted text-xs font-bold uppercase mb-3">What's included</p>
            <div className="space-y-2">
              {FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-discord-text">
                  <FiCheck size={14} className="text-discord-brand flex-shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3.5 mb-4 flex items-start gap-3">
            <FiAlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-400 text-xs leading-relaxed">
              You'll be redirected to Flutterwave's secure checkout to complete your payment. After paying, you'll be returned to VesselX automatically.
            </p>
          </div>

          {initiateError && (
            <div className="bg-discord-red/10 border border-discord-red/30 text-discord-red text-sm px-3 py-2.5 rounded-lg mb-4">
              {initiateError}
            </div>
          )}

          <button
            className="discord-btn w-full py-3 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
            onClick={handleInitiate}
            disabled={initiating}
          >
            {initiating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiZap size={16} /> {currentUser?.isSupa ? 'Renew Supa' : 'Upgrade to Supa'}</>
            )}
          </button>
          <p className="text-discord-muted text-xs text-center mt-2">No hidden fees. Cancel anytime.</p>

          {existingAccount && currentUser?.isSupa && (
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-3">Your Dedicated Payment Account</p>
              <div className="space-y-2">
                <AccountCard label="Bank" value={existingAccount.bankName || '—'} />
                <AccountCard label="Account Number" value={existingAccount.accountNumber || '—'} />
                <AccountCard label="Account Name" value={existingAccount.accountName || '—'} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div>
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <FiClock size={28} className="text-discord-muted mx-auto mb-2" />
              <p className="text-discord-muted text-sm">No payment history yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={h._id || i} className="bg-discord-sidebar rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-discord-text text-sm">{h.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan</span>
                    <span className="text-discord-brand font-bold text-sm">{h.amount ? `₦${Number(h.amount).toLocaleString()}` : h.price || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-discord-muted">
                    <span>{h.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : (h.paymentMethod || h.cardBrand || 'Payment')}</span>
                    <span>{h.createdAt ? format(new Date(h.createdAt), 'MMM d, yyyy') : ''}</span>
                  </div>
                  {h.reference && <p className="text-discord-muted text-[10px] mt-1 font-mono">Ref: {h.reference}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const LANGUAGES_FALLBACK = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', dir: 'ltr' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', dir: 'ltr' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', dir: 'ltr' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dir: 'ltr' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dir: 'ltr' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', dir: 'ltr' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dir: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dir: 'ltr' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dir: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', dir: 'ltr' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', dir: 'ltr' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', dir: 'ltr' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', dir: 'ltr' },
];

function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await API.getSessions();
      setSessions(Array.isArray(data) ? data : data?.sessions || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await API.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      showToast('Session revoked', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to revoke session', { type: 'error' }); }
    finally { setRevoking(null); }
  };

  const handleRevokeAll = async () => {
    if (!confirm('This will sign you out of all other sessions. Continue?')) return;
    setRevoking('all');
    try {
      await API.revokeAllSessions();
      await load();
      showToast('All sessions revoked', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
    finally { setRevoking(null); }
  };

  const fmt = (dateStr) => {
    if (!dateStr) return '';
    try { return format(new Date(dateStr), 'MMM d, yyyy · HH:mm'); } catch { return ''; }
  };

  const deviceIcon = (ua = '') => {
    if (/mobile|android|iphone|ipad/i.test(ua)) return '📱';
    if (/windows/i.test(ua)) return '🖥️';
    if (/mac/i.test(ua)) return '💻';
    return '🌐';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiShield size={18} className="text-discord-brand" />
          <h2 className="text-lg font-bold text-discord-text">Login History</h2>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAll}
            disabled={revoking === 'all'}
            className="text-xs font-semibold text-discord-red hover:underline disabled:opacity-50"
          >
            {revoking === 'all' ? 'Revoking…' : 'Revoke all'}
          </button>
        )}
      </div>
      <p className="text-discord-muted text-sm">These are all the devices that have logged into your account recently.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10">
          <FiClock size={28} className="text-discord-muted/40 mx-auto mb-2" />
          <p className="text-discord-muted text-sm">No session history found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div key={s.sessionId || i} className="bg-discord-sidebar border border-white/5 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="text-2xl flex-shrink-0 mt-0.5">{deviceIcon(s.userAgent)}</div>
                <div className="min-w-0">
                  <p className="text-discord-text text-sm font-semibold truncate">
                    {s.userAgent
                      ? s.userAgent.replace(/\(.*?\)/g, '').trim().slice(0, 48)
                      : 'Unknown device'}
                  </p>
                  {s.ipAddress && (
                    <p className="text-discord-muted text-xs font-mono mt-0.5">{s.ipAddress}</p>
                  )}
                  <p className="text-discord-muted/60 text-xs mt-0.5">{fmt(s.loginAt || s.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(s.sessionId)}
                disabled={!!revoking}
                className="flex-shrink-0 text-xs font-semibold text-discord-red/80 hover:text-discord-red disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-discord-red/10 transition-colors"
              >
                {revoking === s.sessionId ? '…' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageSection({ currentUser }) {
  const { lang, loadTranslations } = useI18n();
  const [languages, setLanguages] = useState(LANGUAGES_FALLBACK);
  const [selected, setSelected] = useState(currentUser?.language || lang || 'en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    API.getLanguages().then(data => {
      if (Array.isArray(data) && data.length > 0) setLanguages(data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const data = await API.updateLanguage(selected);
      await loadTranslations(selected);
      const updated = { ...currentUser, language: selected };
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update language.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = languages.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName?.toLowerCase().includes(search.toLowerCase()) ||
    l.code?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLang = languages.find(l => l.code === selected);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FiGlobe size={20} className="text-discord-brand" />
        <h2 className="text-xl font-bold text-discord-text">Language</h2>
      </div>
      <p className="text-discord-muted text-sm mb-6">Choose your preferred language for the VesselX interface.</p>

      <div className="relative mb-4" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="discord-input w-full flex items-center justify-between cursor-pointer"
        >
          <span className="text-discord-text">
            {selectedLang ? `${selectedLang.nativeName} — ${selectedLang.name}` : selected}
          </span>
          <FiChevronDown size={16} className={`text-discord-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-discord-dark border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 border-b border-white/6">
              <input
                className="discord-input w-full text-sm py-2"
                placeholder="Search languages..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-discord-muted text-sm text-center py-4">No languages found</p>
              ) : filtered.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setSelected(l.code); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                    selected === l.code
                      ? 'bg-discord-brand/15 text-discord-brand'
                      : 'text-discord-text hover:bg-white/5'
                  }`}
                >
                  <span>{l.nativeName} <span className="text-discord-muted">— {l.name}</span></span>
                  <span className="text-discord-muted text-xs font-mono">{l.code}{l.dir === 'rtl' ? ' RTL' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-discord-red/10 border border-discord-red/30 text-discord-red text-sm px-3 py-2.5 rounded-lg mb-4">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2.5 rounded-lg mb-4 flex items-center gap-2">
          <FiCheck size={14} /> Language updated successfully!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || selected === (currentUser?.language || 'en')}
        className="discord-btn px-6 py-2.5 font-semibold disabled:opacity-50 flex items-center gap-2"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiCheck size={14} />
        )}
        Save Language
      </button>

      {languages.length > 0 && (
        <p className="text-discord-muted text-xs mt-3">{languages.length} languages supported</p>
      )}
    </div>
  );
}

export default function Settings({ currentUser, unreadCounts }) {
  const navigate = useNavigate();
  const [section, setSection] = useState('account');
  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(currentUser?.notificationPreferences || {
    likes: true, comments: true, follows: true, messages: true, mentions: true, groups: true, stories: true
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(currentUser?.weeklyDigestEnabled ?? true);
  const [digestSaving, setDigestSaving] = useState(false);

  // Custom URL state
  const [customUrlSlug, setCustomUrlSlug] = useState(currentUser?.customUrl || '');
  const [customUrlStatus, setCustomUrlStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'error'
  const [customUrlSaving, setCustomUrlSaving] = useState(false);
  const customUrlTimer = useRef(null);

  // Bio links state
  const [bioLinks, setBioLinks] = useState([]);
  const [bioLinksLoading, setBioLinksLoading] = useState(false);
  const [bioLinksSaving, setBioLinksSaving] = useState(false);

  // Profile insights state
  const [profileInsights, setProfileInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Auto-load bio links when section becomes active
  useEffect(() => {
    if (section === 'bio-links' && bioLinks.length === 0 && !bioLinksLoading) loadBioLinks();
    if (section === 'support' && supportTickets === null) loadSupportTickets();
  }, [section]);

  // Support tickets state
  const [supportTickets, setSupportTickets] = useState(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [activeTicketData, setActiveTicketData] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ category: 'bug_report', subject: '', message: '' });
  const [newTicketLoading, setNewTicketLoading] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [ticketReplySending, setTicketReplySending] = useState(false);
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketClosing, setTicketClosing] = useState(false);

  // Moderator bot state
  const [modBotStatus, setModBotStatus] = useState(null);
  const [modBotMessages, setModBotMessages] = useState([]);
  const [modBotLoading, setModBotLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const [deleteStep, setDeleteStep] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteChannel, setDeleteChannel] = useState('email');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirm('This action is permanent. We\'ll send you a code to confirm.')) return;
    setDeleteLoading(true);
    try {
      const data = await API.requestAccountDeletion();
      setDeleteChannel(data?.deliveredVia || 'email');
      setDeleteStep('confirm');
    } catch (err) {
      showToast(err.message || 'Something went wrong', { type: 'error' });
    } finally { setDeleteLoading(false); }
  };

  const handleConfirmDelete = async () => {
    if (deleteCode.length < 4) { showToast('Enter the confirmation code', { type: 'error' }); return; }
    setDeleteLoading(true);
    try {
      await API.deleteAccount(deleteCode);
      handleLogout();
    } catch (err) {
      showToast(err.message || 'Invalid or expired code', { type: 'error' });
    } finally { setDeleteLoading(false); }
  };

  const handleTogglePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      const data = await API.togglePrivacy();
      const newVal = data?.isPrivate ?? !isPrivate;
      setIsPrivate(newVal);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, isPrivate: newVal }));
      window.dispatchEvent(new CustomEvent('profileUpdate', { detail: { ...user, isPrivate: newVal } }));
      showToast(newVal ? 'Account set to private' : 'Account set to public', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to update privacy', { type: 'error' }); }
    finally { setPrivacyLoading(false); }
  };

  const handleSaveNotifPrefs = async () => {
    setNotifSaving(true);
    try {
      await API.updateNotificationPreferences(notifPrefs);
      showToast('Notification preferences saved', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to save preferences', { type: 'error' }); }
    finally { setNotifSaving(false); }
  };

  const handleToggleDigest = async (val) => {
    setWeeklyDigest(val);
    setDigestSaving(true);
    try {
      await API.updateDigestPreference(val);
      showToast(val ? 'Weekly digest enabled' : 'Weekly digest disabled', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to update', { type: 'error' }); setWeeklyDigest(!val); }
    finally { setDigestSaving(false); }
  };

  const handleCustomUrlChange = (val) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setCustomUrlSlug(slug);
    setCustomUrlStatus(null);
    if (customUrlTimer.current) clearTimeout(customUrlTimer.current);
    if (slug.length < 3) return;
    setCustomUrlStatus('checking');
    customUrlTimer.current = setTimeout(async () => {
      try {
        const data = await API.checkCustomUrl(slug);
        setCustomUrlStatus(data?.available ? 'available' : 'taken');
      } catch { setCustomUrlStatus('error'); }
    }, 600);
  };

  const handleSaveCustomUrl = async () => {
    if (!customUrlSlug || customUrlStatus !== 'available') return;
    setCustomUrlSaving(true);
    try {
      await API.setCustomUrl(customUrlSlug);
      showToast('Custom URL saved!', { type: 'success' });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, customUrl: customUrlSlug }));
    } catch (err) { showToast(err.message || 'Failed to save URL', { type: 'error' }); }
    finally { setCustomUrlSaving(false); }
  };

  const loadBioLinks = async () => {
    setBioLinksLoading(true);
    try {
      const data = await API.getMyBioLinks();
      setBioLinks(Array.isArray(data) ? data : data?.links || []);
    } catch { setBioLinks([]); }
    finally { setBioLinksLoading(false); }
  };

  const handleSaveBioLinks = async () => {
    setBioLinksSaving(true);
    try {
      await API.updateBioLinks(bioLinks.filter(l => l.url?.trim()));
      showToast('Bio links saved!', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to save links', { type: 'error' }); }
    finally { setBioLinksSaving(false); }
  };

  const loadProfileInsights = async () => {
    setInsightsLoading(true);
    try {
      const data = await API.getProfileInsights();
      setProfileInsights(data);
    } catch { setProfileInsights(null); }
    finally { setInsightsLoading(false); }
  };

  const loadSupportTickets = async () => {
    setSupportLoading(true);
    try {
      const data = await API.getSupportTickets();
      setSupportTickets(Array.isArray(data) ? data : data?.tickets || []);
    } catch { setSupportTickets([]); }
    finally { setSupportLoading(false); }
  };

  const openTicket = async (id) => {
    setTicketLoading(true);
    setActiveTicket(id);
    try {
      const data = await API.getSupportTicket(id);
      setActiveTicketData(data);
    } catch { }
    finally { setTicketLoading(false); }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) return;
    setNewTicketLoading(true);
    try {
      const data = await API.createSupportTicket(newTicketForm);
      const ticket = data.ticket || data;
      const aiReply = data.aiResponse;
      // Add to list
      setSupportTickets(prev => [ticket, ...(prev || [])]);
      setShowNewTicket(false);
      setNewTicketForm({ category: 'bug_report', subject: '', message: '' });
      // Open the thread with AI response pre-loaded
      setActiveTicket(ticket._id);
      setActiveTicketData({ ...ticket, messages: aiReply ? [{ _id: 'ai-1', sender: 'ai', message: aiReply, createdAt: new Date().toISOString() }] : [] });
    } catch (err) { showToast(err.message || 'Failed to create ticket', { type: 'error' }); }
    finally { setNewTicketLoading(false); }
  };

  const handleTicketReply = async () => {
    if (!ticketReply.trim() || ticketReplySending) return;
    setTicketReplySending(true);
    try {
      const data = await API.replySupportTicket(activeTicket, ticketReply.trim());
      const msg = data.message || { sender: 'user', message: ticketReply.trim(), createdAt: new Date().toISOString() };
      setActiveTicketData(prev => ({ ...prev, messages: [...(prev?.messages || []), msg] }));
      setTicketReply('');
    } catch (err) { showToast(err.message || 'Failed to send reply', { type: 'error' }); }
    finally { setTicketReplySending(false); }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket || ticketRating === 0) { showToast('Select a rating first', { type: 'error' }); return; }
    setTicketClosing(true);
    try {
      await API.closeSupportTicket(activeTicket, ticketRating);
      setActiveTicketData(prev => ({ ...prev, status: 'closed' }));
      setSupportTickets(prev => (prev || []).map(t => t._id === activeTicket ? { ...t, status: 'closed' } : t));
      showToast('Ticket closed. Thank you for the rating!', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed to close ticket', { type: 'error' }); }
    finally { setTicketClosing(false); }
  };

  const loadModBotStatus = async () => {
    setModBotLoading(true);
    try {
      const data = await API.getModeratorBotStatus();
      setModBotStatus(data);
    } catch { }
    finally { setModBotLoading(false); }
  };

  const handleModBotAction = async (buttonId) => {
    try {
      const data = await API.chatWithModeratorBot({ buttonId });
      const reply = data.message || data.reply || JSON.stringify(data);
      setModBotMessages(prev => [...prev, { from: 'bot', text: reply }]);
      if (data.status) setModBotStatus(prev => ({ ...prev, status: data.status }));
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
  };

  const SECTIONS = [
    { id: 'account', icon: FiUser, label: 'My Account' },
    { id: 'privacy', icon: FiLock, label: 'Privacy' },
    { id: 'notifications', icon: FiBell, label: 'Notifications' },
    { id: 'security', icon: FiShield, label: 'Security' },
    { id: 'sessions', icon: FiClock, label: 'Login History' },
    { id: 'language', icon: FiGlobe, label: 'Language' },
    { id: 'profile-url', icon: FiLink, label: 'Custom URL' },
    { id: 'bio-links', icon: FiExternalLink, label: 'Bio Links' },
    { id: 'insights', icon: FiBarChart2, label: 'Insights' },
    { id: 'supa', icon: FiZap, label: 'Supa Premium' },
    { id: 'support', icon: FiHelpCircle, label: 'Support' },
  ];

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto pb-20">

        {/* Hero Profile Card */}
        <div className={`relative overflow-hidden ${currentUser?.isSupa ? 'supa-profile-banner' : 'bg-gradient-to-br from-discord-brand/30 via-purple-700/20 to-discord-bg'}`}>
          <div className="px-5 pt-8 pb-6 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <Avatar user={currentUser} size={72} showStatus supaRing={currentUser?.isSupa} className="border-4 border-discord-bg rounded-full shadow-xl" ghostMode={currentUser?.ghostMode} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl font-black truncate ${currentUser?.isSupa ? 'supa-username supa-sparkle' : 'text-discord-text'}`}>
                  {currentUser?.name}
                </h1>
                {currentUser?.isVerified && <VerifiedBadge size={18} username={currentUser?.username} />}
                {currentUser?.isSupa && <SupaBadge size={18} username={currentUser?.username} />}
              </div>
              <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
              <button
                onClick={() => navigate(`/profile/${currentUser?.username}`)}
                className="mt-2 text-xs font-semibold text-discord-brand bg-discord-brand/10 border border-discord-brand/20 px-3 py-1 rounded-full hover:bg-discord-brand/20 transition-all"
              >
                View Profile
              </button>
            </div>
          </div>
        </div>

        {/* Section Tabs — horizontal scrollable */}
        <div className="sticky top-0 z-20 bg-discord-bg/95 backdrop-blur border-b border-discord-hover px-2">
          <div className="flex overflow-x-auto no-scrollbar gap-1 py-2">
            {SECTIONS.map(s => {
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-discord-brand text-white shadow-md shadow-discord-brand/30'
                      : 'text-discord-muted hover:text-discord-text hover:bg-discord-hover'
                  }`}
                >
                  <s.icon size={14} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Content */}
        <div className="px-4 py-5 space-y-4">

          {/* ── Account ── */}
          {section === 'account' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiUser size={18} className="text-discord-brand" /> My Account
              </h2>

              <div className="bg-discord-sidebar border border-white/5 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 hover:bg-discord-hover/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/profile/${currentUser?.username}`)}
                >
                  <div>
                    <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-0.5">Display Name</p>
                    <p className="text-discord-text font-semibold">{currentUser?.name}</p>
                  </div>
                  <span className="text-discord-brand text-xs font-bold group-hover:underline flex items-center gap-1">
                    Edit <FiChevronRight size={13} />
                  </span>
                </div>
                <div className="h-px bg-discord-hover mx-4" />
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-0.5">Username</p>
                    <p className="text-discord-text font-semibold font-mono">@{currentUser?.username}</p>
                  </div>
                </div>
                <div className="h-px bg-discord-hover mx-4" />
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-discord-hover/50 transition-colors group"
                  onClick={() => navigate('/mod-bot')}
                >
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <FiShield size={18} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-discord-text font-semibold text-sm">Community Safety Bot</p>
                    <p className="text-discord-muted text-xs">Report, moderate & manage community safety</p>
                  </div>
                  <FiChevronRight size={15} className="text-discord-muted group-hover:text-discord-text transition-colors flex-shrink-0" />
                </div>
              </div>

              {/* Account Status / Moderator Bot */}
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-discord-hover">
                  <p className="text-discord-text text-sm font-bold">Account Status</p>
                  <p className="text-discord-muted text-xs mt-0.5">Your content moderation standing</p>
                </div>
                <div className="p-4">
                  {!modBotStatus && !modBotLoading && (
                    <button onClick={loadModBotStatus} className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                      <FiShield size={14} /> Check Account Status
                    </button>
                  )}
                  {modBotLoading && (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {modBotStatus && (
                    <div className="space-y-3">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${modBotStatus.status === 'active' ? 'bg-green-500/10 border border-green-500/20' : modBotStatus.status === 'limited' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <span className="text-lg">{modBotStatus.status === 'active' ? '✅' : modBotStatus.status === 'limited' ? '⚠️' : '⛔'}</span>
                        <div>
                          <p className={`text-sm font-bold ${modBotStatus.status === 'active' ? 'text-green-400' : modBotStatus.status === 'limited' ? 'text-yellow-400' : 'text-red-400'}`}>
                            {modBotStatus.status === 'active' ? 'Your account is in good standing' : modBotStatus.status === 'limited' ? 'Your account is temporarily limited' : 'Your account has been banned'}
                          </p>
                          {modBotStatus.reason && <p className="text-discord-muted text-xs mt-0.5">{modBotStatus.reason}</p>}
                        </div>
                      </div>
                      {modBotMessages.map((m, i) => (
                        <div key={i} className="bg-discord-dark rounded-xl px-3 py-2.5 text-sm text-discord-text">{m.text}</div>
                      ))}
                      {(modBotStatus.suggestedButtons || []).map(btn => (
                        <button key={btn.id} onClick={() => handleModBotAction(btn.id)} className="discord-btn w-full py-2.5 text-sm font-semibold">
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-discord-sidebar border border-discord-red/20 rounded-2xl overflow-hidden mt-6">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-discord-red text-xs font-bold uppercase tracking-wide">Danger Zone</p>
                </div>
                <button
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-discord-muted hover:bg-discord-hover hover:text-discord-text transition-colors text-sm font-semibold"
                  onClick={handleLogout}
                >
                  <FiLogOut size={16} className="text-discord-muted" /> Log Out
                </button>
                <div className="h-px bg-discord-hover mx-4" />
                <button
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-discord-red hover:bg-discord-red/10 transition-colors text-sm font-semibold"
                  onClick={handleDeleteAccount}
                >
                  <FiTrash2 size={16} /> Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {section === 'privacy' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiLock size={18} className="text-discord-brand" /> Privacy
              </h2>
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-discord-text font-semibold mb-0.5">Private Account</p>
                    <p className="text-discord-muted text-sm leading-relaxed">Only people you approve can see your posts. New followers will send a follow request first.</p>
                  </div>
                  <button
                    disabled={privacyLoading}
                    onClick={handleTogglePrivacy}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPrivate ? 'bg-discord-brand' : 'bg-discord-hover'} ${privacyLoading ? 'opacity-50' : ''}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                {isPrivate && (
                  <div className="mt-4 p-3 bg-discord-brand/10 border border-discord-brand/20 rounded-xl flex items-center gap-2">
                    <FiLock size={13} className="text-discord-brand flex-shrink-0" />
                    <p className="text-discord-brand text-xs font-semibold">Your account is private. New followers must be approved.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {section === 'notifications' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiBell size={18} className="text-discord-brand" /> Notifications
              </h2>
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl overflow-hidden">
                <p className="text-discord-muted text-sm px-5 pt-4 pb-2">Choose which notifications you want to receive.</p>
                {[
                  { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
                  { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
                  { key: 'follows', label: 'Follows', desc: 'When someone follows you' },
                  { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you' },
                  { key: 'messages', label: 'Messages', desc: 'When you receive a direct message' },
                  { key: 'groups', label: 'Groups', desc: 'Group activity and announcements' },
                  { key: 'stories', label: 'Stories', desc: 'Views and replies to your story' },
                ].map(({ key, label, desc }, i, arr) => (
                  <div key={key}>
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-discord-text font-semibold text-sm">{label}</p>
                        <p className="text-discord-muted text-xs">{desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${notifPrefs[key] !== false ? 'bg-discord-brand' : 'bg-discord-hover'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${notifPrefs[key] !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {i < arr.length - 1 && <div className="h-px bg-discord-hover mx-5" />}
                  </div>
                ))}
                <div className="px-5 pb-5 pt-3 space-y-3">
                  {/* Weekly digest */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Weekly Digest Email</p>
                      <p className="text-discord-muted text-xs">Get a weekly summary every Monday with your top stats</p>
                    </div>
                    <button
                      disabled={digestSaving}
                      onClick={() => handleToggleDigest(!weeklyDigest)}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${weeklyDigest ? 'bg-discord-brand' : 'bg-discord-hover'} ${digestSaving ? 'opacity-50' : ''}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${weeklyDigest ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <button onClick={handleSaveNotifPrefs} disabled={notifSaving} className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                    {notifSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck size={14} />}
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {section === 'security' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiShield size={18} className="text-discord-brand" /> Security
              </h2>
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-discord-brand/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FiLock size={18} className="text-discord-brand" />
                  </div>
                  <div>
                    <p className="text-discord-text font-semibold mb-1">Change Password</p>
                    <p className="text-discord-muted text-sm leading-relaxed">To change your password, log out first and use the "Forgot Password" flow from the login page.</p>
                  </div>
                </div>
                <button className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" onClick={handleLogout}>
                  <FiLogOut size={14} /> Log out & reset password
                </button>
              </div>
            </div>
          )}

          {/* ── Login History / Sessions ── */}
          {section === 'sessions' && (
            <SessionsSection />
          )}

          {/* ── Language ── */}
          {section === 'language' && (
            <div className="animate-fade-in bg-discord-sidebar border border-white/5 rounded-2xl p-5">
              <LanguageSection currentUser={currentUser} />
            </div>
          )}

          {/* ── Custom URL ── */}
          {section === 'profile-url' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiLink size={18} className="text-discord-brand" /> Custom Profile URL
              </h2>
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-5 space-y-4">
                <p className="text-discord-muted text-sm">Set a custom URL for your profile. Share <span className="text-discord-brand font-semibold">vesselx.qzz.io/u/yourslug</span> instead of your username link.</p>
                <div>
                  <label className="text-discord-muted text-xs font-bold uppercase tracking-wide block mb-1.5">Your slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-discord-muted text-sm flex-shrink-0">vesselx.qzz.io/u/</span>
                    <input
                      type="text"
                      value={customUrlSlug}
                      onChange={e => handleCustomUrlChange(e.target.value)}
                      placeholder="your-slug"
                      maxLength={30}
                      className="discord-input flex-1 text-sm"
                    />
                  </div>
                  {customUrlSlug.length > 0 && customUrlSlug.length < 3 && (
                    <p className="text-discord-muted text-xs mt-1">At least 3 characters</p>
                  )}
                  {customUrlStatus === 'checking' && <p className="text-discord-muted text-xs mt-1">Checking availability…</p>}
                  {customUrlStatus === 'available' && <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><FiCheck size={11} /> Available!</p>}
                  {customUrlStatus === 'taken' && <p className="text-discord-red text-xs mt-1 flex items-center gap-1"><FiX size={11} /> Already taken</p>}
                  {customUrlStatus === 'error' && <p className="text-discord-red text-xs mt-1">Could not check availability</p>}
                </div>
                <button
                  onClick={handleSaveCustomUrl}
                  disabled={customUrlSaving || customUrlStatus !== 'available'}
                  className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {customUrlSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck size={14} />}
                  Save Custom URL
                </button>
                {currentUser?.customUrl && (
                  <p className="text-discord-muted text-xs text-center">Current: <span className="text-discord-brand font-semibold">vesselx.qzz.io/u/{currentUser.customUrl}</span></p>
                )}
              </div>
            </div>
          )}

          {/* ── Bio Links ── */}
          {section === 'bio-links' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiExternalLink size={18} className="text-discord-brand" /> Bio Links
              </h2>
              <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-5 space-y-4">
                <p className="text-discord-muted text-sm">Add up to 5 links to your profile. These appear on your public profile page.</p>
                {bioLinksLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(bioLinks.length === 0 ? [{ title: '', url: '' }] : bioLinks).map((link, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            placeholder="Title (e.g. My Website)"
                            value={link.title || ''}
                            onChange={e => setBioLinks(prev => prev.map((l, idx) => idx === i ? { ...l, title: e.target.value } : l))}
                            className="discord-input w-full text-sm py-2"
                          />
                          <input
                            type="url"
                            placeholder="https://..."
                            value={link.url || ''}
                            onChange={e => setBioLinks(prev => prev.map((l, idx) => idx === i ? { ...l, url: e.target.value } : l))}
                            className="discord-input w-full text-sm py-2"
                          />
                        </div>
                        <button
                          onClick={() => setBioLinks(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-discord-muted hover:text-discord-red p-1.5 flex-shrink-0"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                    {bioLinks.length < 5 && (
                      <button
                        onClick={() => setBioLinks(prev => [...prev, { title: '', url: '' }])}
                        className="flex items-center gap-2 text-discord-brand text-sm font-semibold hover:underline"
                      >
                        <FiPlus size={14} /> Add link
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={loadBioLinks}
                    disabled={bioLinksLoading}
                    className="flex-1 py-2.5 rounded-xl border border-discord-hover text-discord-muted text-sm font-semibold hover:text-discord-text transition-colors"
                  >
                    <FiRefreshCw size={13} className="inline mr-1.5" /> Refresh
                  </button>
                  <button
                    onClick={handleSaveBioLinks}
                    disabled={bioLinksSaving}
                    className="flex-1 discord-btn py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {bioLinksSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck size={14} />}
                    Save Links
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Insights ── */}
          {section === 'insights' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiBarChart2 size={18} className="text-discord-brand" /> Profile Insights
              </h2>
              {!profileInsights && !insightsLoading && (
                <button onClick={loadProfileInsights} className="discord-btn w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
                  <FiBarChart2 size={14} /> Load Insights
                </button>
              )}
              {insightsLoading && (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {profileInsights && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Profile Views', value: profileInsights.totalProfileVisits ?? '—', icon: FiEye },
                      { label: 'Impressions', value: profileInsights.totalImpressions ?? '—', icon: FiTrendingUp },
                      { label: 'Followers', value: profileInsights.followers ?? '—', icon: FiUsers },
                      { label: 'Posts', value: profileInsights.totalPosts ?? '—', icon: FiBarChart2 },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-discord-sidebar border border-white/5 rounded-2xl p-4">
                        <Icon size={18} className="text-discord-brand mb-2" />
                        <p className="text-2xl font-black text-discord-text">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                        <p className="text-discord-muted text-xs mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {profileInsights.topPosts?.length > 0 && (
                    <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-4">
                      <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-3">Top Posts</p>
                      <div className="space-y-2">
                        {profileInsights.topPosts.slice(0, 3).map((p, i) => (
                          <div key={p._id || i} className="flex items-center justify-between gap-3">
                            <p className="text-discord-text text-sm truncate flex-1">{p.caption?.slice(0, 50) || '(no caption)'}</p>
                            <span className="text-discord-muted text-xs font-bold flex-shrink-0">{(p.impressions || 0).toLocaleString()} views</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={loadProfileInsights} className="w-full text-discord-brand text-xs font-semibold text-center hover:underline flex items-center justify-center gap-1">
                    <FiRefreshCw size={11} /> Refresh
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Supa Premium ── */}
          {section === 'supa' && (
            <div className="animate-fade-in bg-discord-sidebar border border-white/5 rounded-2xl p-5">
              <SupaSection currentUser={currentUser} />
            </div>
          )}

          {/* ── Support ── */}
          {section === 'support' && (
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-discord-text flex items-center gap-2">
                <FiHelpCircle size={18} className="text-discord-brand" /> Support
              </h2>

              {/* Thread view */}
              {activeTicket && activeTicketData ? (
                <div className="space-y-3">
                  <button onClick={() => { setActiveTicket(null); setActiveTicketData(null); setTicketRating(0); }} className="flex items-center gap-2 text-discord-brand text-sm font-semibold hover:underline">
                    ← Back to tickets
                  </button>
                  <div className="bg-discord-sidebar border border-white/5 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-discord-text">{activeTicketData.subject}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${activeTicketData.status === 'open' ? 'bg-green-500/15 text-green-400' : activeTicketData.status === 'in_progress' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-discord-muted'}`}>
                        {activeTicketData.status || 'open'}
                      </span>
                    </div>
                    <p className="text-discord-muted text-xs">{activeTicketData.category}</p>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {ticketLoading ? (
                      <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" /></div>
                    ) : (activeTicketData.messages || []).map((m, i) => {
                      const isBot = m.sender === 'ai' || m.sender === 'bot' || m.sender === 'support';
                      return (
                        <div key={m._id || i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${isBot ? 'bg-discord-sidebar border border-white/5 text-discord-text' : 'bg-discord-brand text-white'}`}>
                            {isBot && <p className="text-[10px] font-bold text-discord-brand mb-1">Support Bot</p>}
                            <p className="whitespace-pre-wrap break-words">{m.message || m.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {activeTicketData.status !== 'closed' && (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ticketReply}
                          onChange={e => setTicketReply(e.target.value)}
                          placeholder="Write a reply..."
                          className="discord-input flex-1 text-sm"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTicketReply(); } }}
                        />
                        <button onClick={handleTicketReply} disabled={ticketReplySending || !ticketReply.trim()} className="discord-btn px-4 text-sm font-semibold disabled:opacity-50">
                          {ticketReplySending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSend size={14} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-discord-sidebar border border-white/5 rounded-2xl px-4 py-3">
                        <div>
                          <p className="text-discord-text text-sm font-semibold">Close &amp; Rate</p>
                          <p className="text-discord-muted text-xs">Rate this support session</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setTicketRating(star)} className={`transition-colors ${star <= ticketRating ? 'text-yellow-400' : 'text-discord-muted hover:text-yellow-400'}`}>
                              <FiStar size={18} fill={star <= ticketRating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                          <button onClick={handleCloseTicket} disabled={ticketClosing || ticketRating === 0} className="ml-2 discord-btn px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                            {ticketClosing ? '...' : 'Close'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : showNewTicket ? (
                <div className="space-y-3">
                  <button onClick={() => setShowNewTicket(false)} className="flex items-center gap-2 text-discord-brand text-sm font-semibold hover:underline">
                    ← Back
                  </button>
                  <form onSubmit={handleCreateTicket} className="space-y-3">
                    <div>
                      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-2">Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['account_access','account_hacked','billing','bug_report','content_appeal','feature_request','harassment','impersonation','data_privacy','other'].map(c => {
                          const active = newTicketForm.category === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewTicketForm(f => ({ ...f, category: c }))}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${
                                active
                                  ? 'bg-discord-brand text-white border-discord-brand'
                                  : 'bg-discord-sidebar border-discord-hover text-discord-muted hover:text-discord-text hover:border-white/20'
                              }`}
                            >
                              {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Subject</label>
                      <input type="text" value={newTicketForm.subject} onChange={e => setNewTicketForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description" className="discord-input w-full text-sm" required />
                    </div>
                    <div>
                      <label className="block text-discord-muted text-xs font-bold uppercase tracking-wide mb-1.5">Message</label>
                      <textarea value={newTicketForm.message} onChange={e => setNewTicketForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your issue in detail..." rows={4} className="discord-input w-full text-sm resize-none" required />
                    </div>
                    <button type="submit" disabled={newTicketLoading} className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {newTicketLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSend size={14} />}
                      Submit Ticket
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <button onClick={() => setShowNewTicket(true)} className="discord-btn w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
                    <FiPlus size={14} /> New Support Ticket
                  </button>
                  {supportLoading ? (
                    <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" /></div>
                  ) : (supportTickets || []).length === 0 ? (
                    <div className="text-center py-10 bg-discord-sidebar rounded-2xl border border-white/5">
                      <FiHelpCircle size={28} className="text-discord-muted/40 mx-auto mb-2" />
                      <p className="text-discord-muted text-sm">No tickets yet. Open one if you need help.</p>
                    </div>
                  ) : (supportTickets || []).map(ticket => (
                    <button key={ticket._id} onClick={() => openTicket(ticket._id)} className="w-full text-left bg-discord-sidebar border border-white/5 rounded-2xl p-4 hover:bg-discord-hover/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-discord-text text-sm truncate flex-1">{ticket.subject}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${ticket.status === 'open' ? 'bg-green-500/15 text-green-400' : ticket.status === 'in_progress' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-white/10 text-discord-muted'}`}>
                          {ticket.status || 'open'}
                        </span>
                      </div>
                      <p className="text-discord-muted text-xs">{(ticket.category || '').replace(/_/g, ' ')} · {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {deleteStep === 'confirm' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-discord-sidebar border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-discord-red/15 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 size={22} className="text-discord-red" />
            </div>
            <h3 className="text-lg font-bold text-discord-text text-center mb-1">Confirm Account Deletion</h3>
            <p className="text-discord-muted text-sm text-center mb-4">
              We sent a confirmation code to your{' '}
              <span className="text-discord-text font-semibold">
                {deleteChannel === 'telegram_bot' ? 'Telegram chat with the bot' :
                 deleteChannel === 'telegram_gateway' ? 'Telegram (via phone)' :
                 'email inbox'}
              </span>. Enter it below to permanently delete your account.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={deleteCode}
              onChange={e => setDeleteCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6-digit code"
              className="discord-input w-full text-center text-lg tracking-widest mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteStep(null); setDeleteCode(''); }}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-md bg-discord-hover hover:bg-discord-hover/70 text-discord-text font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading || deleteCode.length < 4}
                className="flex-1 py-2.5 rounded-md bg-discord-red hover:bg-discord-red/80 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
