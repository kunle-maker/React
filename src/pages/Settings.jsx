import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiTrash2, FiLogOut, FiShield, FiZap, FiChevronRight, FiCreditCard, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { formatDistanceToNow, format } from 'date-fns';
import Layout from '../components/Layout';
import API from '../utils/api';

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return digits;
}

function CardPaymentForm({ plan, onSuccess, onCancel }) {
  const [form, setForm] = useState({ cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '', cardHolderName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiryDisplay, setExpiryDisplay] = useState('');

  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) setExpiryDisplay(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    else setExpiryDisplay(raw);
    setForm(f => ({ ...f, expiryMonth: raw.slice(0, 2), expiryYear: raw.length >= 3 ? `20${raw.slice(2)}` : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const digits = form.cardNumber.replace(/\s/g, '');
      const result = await API.subscribeToSupa({
        plan,
        cardNumber: digits,
        cvv: form.cvv,
        expiryMonth: form.expiryMonth,
        expiryYear: form.expiryYear,
        cardHolderName: form.cardHolderName,
      });
      onSuccess(result);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const digits = form.cardNumber.replace(/\s/g, '');
  const brand = digits.startsWith('4') ? 'VISA' : digits.startsWith('5') ? 'MC' : digits.startsWith('3') ? 'AMEX' : '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-discord-sidebar border border-discord-hover rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-discord-hover flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiCreditCard size={18} className="text-discord-brand" />
            <h3 className="font-bold text-discord-text">Card Payment</h3>
          </div>
          <button onClick={onCancel} className="text-discord-muted hover:text-discord-text transition-colors p-1">
            <FiX size={18} />
          </button>
        </div>

        {/* Card preview */}
        <div className="mx-5 mt-4 rounded-xl p-4 bg-gradient-to-br from-discord-brand to-purple-700 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="w-8 h-6 rounded bg-white/30" />
            {brand && <span className="font-bold text-sm tracking-wider opacity-90">{brand}</span>}
          </div>
          <p className="font-mono text-lg tracking-widest mb-2 opacity-90">
            {form.cardNumber || '•••• •••• •••• ••••'}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-[10px] uppercase">Card Holder</p>
              <p className="text-sm font-medium truncate max-w-[160px]">{form.cardHolderName || 'YOUR NAME'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[10px] uppercase">Expires</p>
              <p className="text-sm">{expiryDisplay || 'MM / YY'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-discord-muted text-xs font-semibold uppercase mb-1 block">Cardholder Name</label>
            <input
              className="discord-input w-full text-sm"
              placeholder="John Doe"
              value={form.cardHolderName}
              onChange={e => setForm(f => ({ ...f, cardHolderName: e.target.value.toUpperCase() }))}
              required
            />
          </div>
          <div>
            <label className="text-discord-muted text-xs font-semibold uppercase mb-1 block">Card Number</label>
            <input
              className="discord-input w-full text-sm font-mono tracking-wider"
              placeholder="1234 5678 9012 3456"
              value={form.cardNumber}
              onChange={e => setForm(f => ({ ...f, cardNumber: formatCardNumber(e.target.value) }))}
              inputMode="numeric"
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-discord-muted text-xs font-semibold uppercase mb-1 block">Expiry</label>
              <input
                className="discord-input w-full text-sm font-mono"
                placeholder="MM / YY"
                value={expiryDisplay}
                onChange={handleExpiryChange}
                inputMode="numeric"
                required
              />
            </div>
            <div className="w-28">
              <label className="text-discord-muted text-xs font-semibold uppercase mb-1 block">CVV</label>
              <input
                className="discord-input w-full text-sm font-mono"
                placeholder="•••"
                value={form.cvv}
                onChange={e => setForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                inputMode="numeric"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-discord-red/10 border border-discord-red/30 text-discord-red text-sm px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="discord-btn w-full py-3 font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><FiZap size={16} /> Pay & Activate Supa</>
            )}
          </button>
          <p className="text-discord-muted text-[11px] text-center">Your payment is processed securely.</p>
        </form>
      </div>
    </div>
  );
}

function SupaSection({ currentUser }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showForm, setShowForm] = useState(false);
  const [payResult, setPayResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState('plans');
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const handleSuccess = (result) => {
    setShowForm(false);
    setPayResult(result);
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
  ];

  if (payResult) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
          <FiCheck size={28} className="text-green-400" />
        </div>
        <h3 className="font-bold text-discord-text text-xl mb-1">You're now Supa! 🎉</h3>
        <p className="text-discord-muted text-sm mb-5">Your subscription is active.</p>
        <div className="bg-discord-sidebar border border-discord-hover rounded-xl p-4 text-left space-y-2 text-sm">
          {payResult.cardBrand && <div className="flex justify-between"><span className="text-discord-muted">Card</span><span className="text-discord-text font-medium">{payResult.cardBrand} •••• {payResult.cardLastFour}</span></div>}
          {payResult.reference && <div className="flex justify-between"><span className="text-discord-muted">Ref</span><span className="text-discord-text font-mono text-xs">{payResult.reference}</span></div>}
          {payResult.supaExpiresAt && <div className="flex justify-between"><span className="text-discord-muted">Renews</span><span className="text-discord-text">{format(new Date(payResult.supaExpiresAt), 'MMM d, yyyy')}</span></div>}
        </div>
      </div>
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

      {/* Tab switcher */}
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
          {/* Plan cards */}
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
                  <p className="text-2xl font-black text-discord-text ml-6">{plan.price} <span className="text-sm font-normal text-discord-muted">{plan.period}</span></p>
                </div>
              );
            })}
          </div>

          {/* Features */}
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

          <button
            className="discord-btn w-full py-3 font-bold text-base flex items-center justify-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <FiZap size={16} /> {currentUser?.isSupa ? 'Renew Supa' : 'Upgrade to Supa'}
          </button>
          <p className="text-discord-muted text-xs text-center mt-2">Cancel anytime. No hidden fees.</p>
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
                    <span className="text-discord-brand font-bold text-sm">{h.amount || h.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-discord-muted">
                    <span>{h.cardBrand} •••• {h.cardLastFour}</span>
                    <span>{h.createdAt ? format(new Date(h.createdAt), 'MMM d, yyyy') : ''}</span>
                  </div>
                  {h.reference && <p className="text-discord-muted text-[10px] mt-1 font-mono">Ref: {h.reference}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <CardPaymentForm
          plan={selectedPlan}
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
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
    } catch (err) { alert(err.message); }
  };

  const SECTIONS = [
    { id: 'account', icon: FiUser, label: 'My Account' },
    { id: 'security', icon: FiShield, label: 'Security' },
    { id: 'supa', icon: FiZap, label: 'Supa Premium' },
  ];

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="flex h-full">
        {/* Sidebar */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl">
          {section === 'account' && (
            <div>
              <h2 className="text-xl font-bold text-discord-text mb-6">My Account</h2>
              <div className="bg-discord-sidebar rounded-lg p-4 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-discord-text">{currentUser?.name}</p>
                    <p className="text-discord-muted text-sm">@{currentUser?.username}</p>
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

          {section === 'supa' && <SupaSection currentUser={currentUser} />}
        </div>
      </div>
    </Layout>
  );
}
