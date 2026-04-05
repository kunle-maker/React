import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUser, FiLock, FiTrash2, FiLogOut, FiShield, FiZap,
  FiChevronRight, FiCheck, FiX, FiClock, FiCopy, FiGlobe,
  FiRefreshCw, FiAlertCircle, FiBell, FiChevronDown
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import { SupaBadge } from '../components/UserBadge';
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

  useEffect(() => {
    API.getSupaPlans().then(data => {
      const list = Array.isArray(data) ? data : data.plans || [];
      setPlans(list);
      if (list.length) setSelectedPlan(list[0].id || list[0].plan || 'monthly');
    }).catch(() => {
      setPlans([
        { id: 'monthly', label: 'Monthly', price: '₦1,100', period: '/month' },
        { id: 'yearly', label: 'Yearly', price: '₦12,000', period: '/year', badge: 'Save 9%' },
      ]);
    });

    API.getSupaPaymentAccount().then(data => {
      if (data?.accountNumber || data?.payment?.accountNumber) {
        setExistingAccount(data?.payment || data);
      }
    }).catch(() => { });
  }, []);

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
      setPaymentData(data);
      setShowTransfer(true);
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

  if (showTransfer && paymentData) {
    return (
      <BankTransferScreen
        paymentData={paymentData}
        plan={selectedPlan}
        onActivated={handleActivated}
        onBack={() => { setShowTransfer(false); setPaymentData(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <HiSparkles size={22} className="text-discord-brand" />
        <h2 className="text-xl font-bold text-discord-text">Supa Premium</h2>
      </div>
      <p className="text-discord-muted text-sm mb-5">Unlock the full VesselX experience.</p>

      {currentUser?.isSupa && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-5 flex items-center gap-2">
          <FiCheck size={16} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm font-semibold">Your Supa subscription is active!</p>
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
              Pay via bank transfer — no card required. Your Supa access activates automatically once your transfer is confirmed.
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const pw = prompt('Enter your password to confirm account deletion:');
    if (!pw) return;
    if (!confirm('This action is permanent. Delete your account?')) return;
    try {
      await API.deleteAccount(pw);
      handleLogout();
    } catch (err) { showToast(err.message || 'Something went wrong', { type: 'error' }); }
  };

  const SECTIONS = [
    { id: 'account', icon: FiUser, label: 'My Account' },
    { id: 'security', icon: FiShield, label: 'Security' },
    { id: 'language', icon: FiGlobe, label: 'Language' },
    { id: 'supa', icon: FiZap, label: 'Supa Premium' },
  ];

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex h-full">
        <div className="w-64 border-r border-discord-hover bg-discord-sidebar p-3 flex flex-col hidden md:flex">
          <p className="text-discord-muted text-xs font-bold uppercase px-2 py-1.5 mb-1">User Settings</p>
          {SECTIONS.map(s => (
            <button key={s.id} className={`nav-item mb-0.5 ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
              <s.icon size={16} /> {s.label}
            </button>
          ))}
          <div className="mt-auto space-y-0.5">
            <button
              className="nav-item w-full text-discord-muted hover:text-orange-400 hover:bg-orange-400/10"
              onClick={() => navigate('/mod-bot')}
            >
              <FiShield size={16} /> Moderator Bot
            </button>
            <button className="nav-item text-discord-red hover:bg-discord-red/10 w-full" onClick={handleLogout}>
              <FiLogOut size={16} /> Log Out
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl">
          {section === 'account' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-6">My Account</h2>
              <div className="bg-discord-sidebar rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-discord-text">{currentUser?.name}</p>
                    <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
                    {currentUser?.isSupa && (
                      <span className="mt-1 inline-flex"><SupaBadge size={15} username={currentUser?.username} /></span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-discord-sidebar rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Display Name</p>
                      <p className="text-discord-muted text-sm">{currentUser?.name}</p>
                    </div>
                    <button className="text-discord-brand text-sm hover:underline" onClick={() => navigate(`/profile/${currentUser?.username}`)}>Edit</button>
                  </div>
                </div>
                <div className="bg-discord-sidebar rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Username</p>
                      <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
                    </div>
                  </div>
                </div>
                <div
                  className="bg-discord-sidebar rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-discord-hover transition-colors group"
                  onClick={() => navigate('/mod-bot')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <FiShield size={18} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-discord-text font-semibold text-sm">Community Safety Bot</p>
                      <p className="text-discord-muted text-xs">Report, moderate and manage community safety</p>
                    </div>
                  </div>
                  <FiChevronRight size={16} className="text-discord-muted group-hover:text-discord-text transition-colors" />
                </div>
              </div>

              <div className="mt-6 md:hidden space-y-2">
                <p className="text-discord-muted text-xs font-bold uppercase px-1 mb-2">More Settings</p>
                <button className="nav-item w-full" onClick={() => setSection('security')}><FiShield size={16} /> Security</button>
                <button className="nav-item w-full" onClick={() => setSection('language')}><FiGlobe size={16} /> Language</button>
                <button className="nav-item w-full" onClick={() => setSection('supa')}><FiZap size={16} /> Supa Premium</button>
              </div>

              <div className="mt-8 pt-6 border-t border-discord-hover space-y-3">
                <h3 className="text-discord-red font-semibold">Danger Zone</h3>
                <button className="flex items-center gap-2 w-full text-discord-muted hover:bg-discord-hover transition-colors px-4 py-3 rounded-lg text-sm font-semibold" onClick={handleLogout}>
                  <FiLogOut size={14} /> Log Out
                </button>
                <button className="flex items-center gap-2 text-discord-red hover:bg-discord-red/10 px-4 py-2 rounded-lg transition-colors text-sm font-semibold border border-discord-red/30" onClick={handleDeleteAccount}>
                  <FiTrash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          )}

          {section === 'security' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-6">Security</h2>
              <div className="bg-discord-sidebar rounded-lg p-4">
                <p className="text-discord-text font-semibold mb-1">Change Password</p>
                <p className="text-discord-muted text-sm mb-4">To change your password, use the "Forgot Password" flow from the login page.</p>
                <button className="discord-btn text-sm px-4 py-2" onClick={handleLogout}>Log out and reset password</button>
              </div>
            </div>
          )}

          {section === 'language' && <LanguageSection currentUser={currentUser} />}

          {section === 'supa' && <SupaSection currentUser={currentUser} />}
        </div>
      </div>
    </Layout>
  );
}
