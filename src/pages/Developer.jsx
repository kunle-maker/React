import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCode, FiZap, FiBox, FiCpu, FiTrendingUp, FiPlus, FiTrash2, FiEdit2,
  FiCopy, FiCheck, FiX, FiRefreshCw, FiGlobe, FiKey, FiPlay, FiHeart,
  FiEye, FiGitMerge, FiSearch, FiChevronDown, FiExternalLink, FiStar,
  FiAward, FiUsers, FiBookOpen, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import API from '../utils/api';
import { showToast } from '../utils/toast';

const DEV_BADGE_LABELS = { junior_dev: 'Junior Dev', dev: 'Developer', senior_dev: 'Senior Dev' };
const DEV_BADGE_COLORS = { junior_dev: 'text-blue-400 bg-blue-500/15 border-blue-500/25', dev: 'text-discord-brand bg-discord-brand/15 border-discord-brand/25', senior_dev: 'text-purple-400 bg-purple-500/15 border-purple-500/25' };

const BOT_CATEGORIES = ['utility','entertainment','productivity','social','news','education','games','tools','other'];
const WEBHOOK_EVENTS = ['message','command','user_joined_bot','user_left_bot'];

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${copied ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-white/5 text-discord-muted border-white/10 hover:border-discord-brand/40 hover:text-discord-brand'}`}>
      {copied ? <FiCheck size={11} /> : <FiCopy size={11} />}
      {copied ? 'Copied' : (label || 'Copy')}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color = 'text-discord-brand' }) {
  return (
    <div className="bg-white/3 border border-white/6 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} className={color} />
        <span className="text-discord-muted text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-discord-text text-2xl font-black">{value ?? '—'}</p>
    </div>
  );
}

function XPBar({ xp, level }) {
  const levels = [0,100,250,500,1000,2000,4000,7000,12000,20000];
  const curr = levels[level - 1] || 0;
  const next = levels[level] || levels[levels.length - 1];
  const pct = next > curr ? Math.min(((xp - curr) / (next - curr)) * 100, 100) : 100;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-discord-muted mb-1">
        <span>{xp} XP</span>
        <span>Lv.{(level || 1) + 1} needs {next} XP</span>
      </div>
      <div className="h-2 bg-discord-hover rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-discord-brand to-purple-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Dashboard({ profile }) {
  if (!profile) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" /></div>;
  const { user, stats } = profile;
  const badge = user?.devBadge;
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-discord-brand/15 via-purple-500/8 to-transparent border border-discord-brand/20 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-discord-brand/20 flex items-center justify-center border border-discord-brand/30">
            <FiCode size={26} className="text-discord-brand" />
          </div>
          <div>
            <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-0.5">Developer Platform</p>
            <p className="text-discord-text text-xl font-black">@{user?.username}</p>
            {badge && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${DEV_BADGE_COLORS[badge] || 'text-discord-muted bg-white/5 border-white/10'}`}>
                {DEV_BADGE_LABELS[badge] || badge}
              </span>
            )}
          </div>
          <div className="ml-auto text-right">
            <p className="text-discord-muted text-xs">Level</p>
            <p className="text-3xl font-black text-discord-text">{user?.devLevel ?? 1}</p>
          </div>
        </div>
        <XPBar xp={user?.devXp ?? 0} level={user?.devLevel ?? 1} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Apps" value={stats?.totalApps} icon={FiBox} />
        <StatCard label="Bots" value={stats?.totalBots} icon={FiCpu} color="text-purple-400" />
        <StatCard label="Snippets" value={stats?.totalSnippets} icon={FiCode} color="text-green-400" />
        <StatCard label="API Requests" value={stats?.totalApiRequests} icon={FiZap} color="text-yellow-400" />
        <StatCard label="Likes" value={stats?.totalLikes} icon={FiHeart} color="text-red-400" />
        <StatCard label="Views" value={stats?.totalViews} icon={FiEye} color="text-blue-400" />
        <StatCard label="Forks" value={stats?.totalForks} icon={FiGitMerge} color="text-orange-400" />
        <StatCard label="Bot Subscribers" value={stats?.totalBotSubscribers} icon={FiUsers} color="text-teal-400" />
      </div>

      <div className="bg-white/3 border border-white/6 rounded-xl p-4">
        <p className="text-discord-muted text-xs font-bold uppercase tracking-wide mb-3">Dev XP Awards</p>
        <div className="space-y-2">
          {[['Create an app','+ 50 XP'],['Create a bot','+ 100 XP'],['Publish a snippet','+ 20 XP'],['Fork a snippet','+ 10 XP'],['Your snippet gets forked','+ 10 XP'],['Your snippet gets liked','+ 5 XP']].map(([action, xp]) => (
            <div key={action} className="flex justify-between items-center text-sm">
              <span className="text-discord-muted">{action}</span>
              <span className="text-discord-brand font-bold text-xs">{xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppsTab({ apps, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', website: '', webhookUrl: '', webhookSecret: '', webhookEvents: [] });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [regenKey, setRegenKey] = useState({});
  const [webhookResults, setWebhookResults] = useState({});
  const [deleting, setDeleting] = useState(null);

  const toggleEvent = (ev) => setForm(f => ({ ...f, webhookEvents: f.webhookEvents.includes(ev) ? f.webhookEvents.filter(e => e !== ev) : [...f.webhookEvents, ev] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const data = await API.createDevApp({ ...form, webhookEvents: form.webhookEvents.length ? form.webhookEvents : undefined });
      setNewKey({ name: data.app?.name || form.name, key: data.app?.apiKey || data.apiKey });
      setForm({ name: '', description: '', website: '', webhookUrl: '', webhookSecret: '', webhookEvents: [] });
      setShowCreate(false);
      onRefresh();
    } catch (err) { showToast(err.message || 'Failed to create app', { type: 'error' }); }
    finally { setCreating(false); }
  };

  const handleRegen = async (appId) => {
    setRegenKey(r => ({ ...r, [appId]: true }));
    try {
      const data = await API.regenerateDevAppKey(appId);
      setNewKey({ name: apps.find(a => a._id === appId)?.name || 'App', key: data.apiKey });
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
    finally { setRegenKey(r => ({ ...r, [appId]: false })); }
  };

  const handleWebhookTest = async (appId) => {
    setWebhookResults(r => ({ ...r, [appId]: { loading: true } }));
    try {
      const data = await API.testDevWebhook(appId);
      setWebhookResults(r => ({ ...r, [appId]: { success: data.success, status: data.statusCode } }));
    } catch (err) { setWebhookResults(r => ({ ...r, [appId]: { success: false, error: err.message } })); }
  };

  const handleDelete = async (appId) => {
    if (deleting === appId) {
      try {
        await API.deleteDevApp(appId);
        showToast('App deleted', { type: 'success' });
        onRefresh();
      } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
      finally { setDeleting(null); }
    } else {
      setDeleting(appId);
      setTimeout(() => setDeleting(d => d === appId ? null : d), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-yellow-400 font-bold text-sm mb-1">Save your API key for <span className="text-discord-text">{newKey.name}</span></p>
              <p className="text-yellow-400/70 text-xs mb-2">This key is shown only once. Store it somewhere safe.</p>
              <div className="font-mono text-xs bg-black/30 rounded-lg px-3 py-2 text-yellow-300 break-all">{newKey.key}</div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <CopyBtn text={newKey.key} label="Copy Key" />
              <button onClick={() => setNewKey(null)} className="text-discord-muted hover:text-discord-text"><FiX size={16} /></button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-2 bg-discord-brand hover:bg-discord-brand/90 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95">
        <FiPlus size={16} /> New App
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-discord-sidebar border border-white/8 rounded-2xl p-5 space-y-3 animate-fade-in">
          <h3 className="font-bold text-discord-text">Create Developer App</h3>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="App name *" className="discord-input w-full" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="discord-input w-full" />
          <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="Website URL" className="discord-input w-full" />
          <input value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="Webhook URL (https://...)" className="discord-input w-full" />
          <input value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))} placeholder="Webhook secret (optional)" className="discord-input w-full" />
          {form.webhookUrl && (
            <div>
              <p className="text-discord-muted text-xs font-bold mb-1.5">Webhook Events</p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map(ev => (
                  <button key={ev} type="button" onClick={() => toggleEvent(ev)} className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${form.webhookEvents.includes(ev) ? 'bg-discord-brand text-white border-discord-brand' : 'bg-white/4 text-discord-muted border-white/10 hover:border-white/20'}`}>{ev}</button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating} className="flex items-center gap-2 bg-discord-brand text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60 transition-all">
              {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPlus size={14} />} Create App
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-discord-muted hover:text-discord-text border border-white/10 hover:border-white/20 transition-all">Cancel</button>
          </div>
        </form>
      )}

      {apps.length === 0 ? (
        <div className="text-center py-12 text-discord-muted">
          <FiBox size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No apps yet</p>
          <p className="text-xs mt-1">Create your first developer app to get an API key</p>
        </div>
      ) : apps.map(app => (
        <div key={app._id} className="bg-discord-sidebar border border-white/8 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-discord-text text-sm">{app.name}</p>
                {app.website && <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-discord-brand text-xs hover:underline flex items-center gap-0.5"><FiExternalLink size={10} />{app.website.replace(/^https?:\/\//, '')}</a>}
              </div>
              {app.description && <p className="text-discord-muted text-xs mt-0.5">{app.description}</p>}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => handleRegen(app._id)} disabled={regenKey[app._id]} title="Regenerate API Key" className="w-8 h-8 flex items-center justify-center rounded-lg text-discord-muted hover:text-yellow-400 hover:bg-yellow-400/10 border border-white/8 transition-all">
                {regenKey[app._id] ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiRefreshCw size={13} />}
              </button>
              <button onClick={() => handleDelete(app._id)} title="Delete App" className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${deleting === app._id ? 'text-discord-red bg-discord-red/10 border-discord-red/30' : 'text-discord-muted hover:text-discord-red hover:bg-discord-red/10 border-white/8'}`}>
                <FiTrash2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 border border-white/5">
            <FiKey size={12} className="text-discord-muted flex-shrink-0" />
            <span className="font-mono text-xs text-discord-muted truncate flex-1">{app.apiKey || 'vxapp_••••••••••••••••'}</span>
            {app.apiKey && <CopyBtn text={app.apiKey} />}
          </div>

          {app.webhookUrl && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5 flex-1 min-w-0">
                <FiGlobe size={11} className="text-discord-muted flex-shrink-0" />
                <span className="text-xs text-discord-muted truncate">{app.webhookUrl}</span>
              </div>
              <button onClick={() => handleWebhookTest(app._id)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${webhookResults[app._id]?.loading ? 'opacity-60 pointer-events-none' : webhookResults[app._id]?.success === true ? 'bg-green-500/15 text-green-400 border-green-500/25' : webhookResults[app._id]?.success === false ? 'bg-discord-red/15 text-discord-red border-discord-red/25' : 'bg-white/5 text-discord-muted border-white/10 hover:border-discord-brand/40 hover:text-discord-brand'}`}>
                {webhookResults[app._id]?.loading ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiPlay size={11} />}
                {webhookResults[app._id]?.success === true ? `OK ${webhookResults[app._id].status}` : webhookResults[app._id]?.success === false ? 'Failed' : 'Test Webhook'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BotStoreTab({ currentUser }) {
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('popular');
  const [starting, setStarting] = useState({});

  const fetchBots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getBots({ search: search || undefined, category: category || undefined, sort });
      setBots(Array.isArray(data) ? data : data.bots || []);
    } catch { setBots([]); }
    finally { setLoading(false); }
  }, [search, category, sort]);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  const handleStart = async (bot) => {
    setStarting(s => ({ ...s, [bot._id]: true }));
    try {
      const data = await API.startBot(bot.username);
      showToast(data.welcomeMessage ? `Bot started: ${data.welcomeMessage.slice(0,60)}` : 'Bot started!', { type: 'success' });
      navigate(`/messages/chat/${bot.username}`);
    } catch (err) { showToast(err.message || 'Failed to start bot', { type: 'error' }); }
    finally { setStarting(s => ({ ...s, [bot._id]: false })); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px] relative">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bots..." className="discord-input pl-8 w-full text-sm py-2" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="discord-input text-sm py-2 pr-8 min-w-[120px]">
          <option value="">All categories</option>
          {BOT_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="discord-input text-sm py-2 pr-8">
          <option value="popular">Popular (MAU)</option>
          <option value="newest">Newest</option>
          <option value="users">All-time Users</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-discord-sidebar border border-white/6 rounded-2xl animate-pulse" />)}
        </div>
      ) : bots.length === 0 ? (
        <div className="text-center py-12 text-discord-muted">
          <FiCpu size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No bots found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bots.map(bot => (
            <div key={bot._id} className="bg-discord-sidebar border border-white/8 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-discord-brand/20 flex items-center justify-center border border-discord-brand/25 flex-shrink-0 text-lg">
                  {bot.profilePicture ? <img src={bot.profilePicture} className="w-full h-full object-cover rounded-xl" alt="" /> : '⚙️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-discord-text text-sm">{bot.name || bot.username}</span>
                    <span className="text-[10px] text-discord-brand bg-discord-brand/10 px-1.5 py-0.5 rounded-md font-semibold border border-discord-brand/20">⚙️ BOT</span>
                  </div>
                  <p className="text-discord-muted text-xs">@{bot.username}</p>
                </div>
              </div>
              {(bot.shortDescription || bot.bio) && <p className="text-discord-muted text-xs leading-relaxed line-clamp-2">{bot.shortDescription || bot.bio}</p>}
              <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                <div className="flex items-center gap-3 text-xs text-discord-muted">
                  {bot.category && <span className="capitalize">{bot.category}</span>}
                  {bot.monthlyActiveUsers != null && (
                    <span className="flex items-center gap-1" title="Monthly active users"><FiUsers size={10} />{bot.monthlyActiveUsers} MAU</span>
                  )}
                  {bot.totalUsers != null && bot.monthlyActiveUsers == null && (
                    <span className="flex items-center gap-1"><FiUsers size={10} />{bot.totalUsers}</span>
                  )}
                </div>
                <button onClick={() => handleStart(bot)} disabled={starting[bot._id]} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-discord-brand hover:bg-discord-brand/90 text-white transition-all active:scale-95 disabled:opacity-60">
                  {starting[bot._id] ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPlay size={11} />}
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyBotsTab({ onRefresh }) {
  const [myBots, setMyBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', bio: '', shortDescription: '', category: 'utility', welcomeMessage: '', tags: '', isPublic: true });
  const [creating, setCreating] = useState(false);
  const [newBotKey, setNewBotKey] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const fetchMyBots = async () => {
    setLoading(true);
    try {
      const data = await API.getMyBots();
      setMyBots(Array.isArray(data) ? data : data.bots || []);
    } catch { setMyBots([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyBots(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.name.trim()) return;
    setCreating(true);
    try {
      const data = await API.createBot({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setNewBotKey({ username: data.bot?.username, key: data.apiKey });
      setForm({ username: '', name: '', bio: '', shortDescription: '', category: 'utility', welcomeMessage: '', tags: '', isPublic: true });
      setShowCreate(false);
      fetchMyBots();
      onRefresh();
    } catch (err) { showToast(err.message || 'Failed to create bot', { type: 'error' }); }
    finally { setCreating(false); }
  };

  const handleDelete = async (botId) => {
    if (deleting === botId) {
      try {
        await API.deleteBot(botId);
        showToast('Bot deleted', { type: 'success' });
        fetchMyBots();
        onRefresh();
      } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
      finally { setDeleting(null); }
    } else {
      setDeleting(botId);
      setTimeout(() => setDeleting(d => d === botId ? null : d), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {newBotKey && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 animate-fade-in">
          <p className="text-yellow-400 font-bold text-sm mb-1">Bot API Key for @{newBotKey.username}</p>
          <p className="text-yellow-400/70 text-xs mb-2">Use <code className="text-yellow-300">Authorization: Bot {newBotKey.key}</code> in your bot server requests.</p>
          <div className="font-mono text-xs bg-black/30 rounded-lg px-3 py-2 text-yellow-300 break-all mb-2">{newBotKey.key}</div>
          <div className="flex gap-2">
            <CopyBtn text={newBotKey.key} label="Copy Key" />
            <button onClick={() => setNewBotKey(null)} className="text-discord-muted hover:text-discord-text text-xs">Dismiss</button>
          </div>
        </div>
      )}

      <button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-2 bg-discord-brand hover:bg-discord-brand/90 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95">
        <FiPlus size={16} /> New Bot
      </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-discord-sidebar border border-white/8 rounded-2xl p-5 space-y-3 animate-fade-in">
          <h3 className="font-bold text-discord-text">Create Bot</h3>
          <div>
            <input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Bot username (must end with Bot, e.g. WeatherBot) *" className="discord-input w-full" />
            <p className="text-discord-muted text-[11px] mt-1">5–32 chars, start with a letter, end with Bot</p>
          </div>
          <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Display name *" className="discord-input w-full" />
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Bio / description" className="discord-input w-full resize-none" rows={2} />
          <div>
            <input value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} placeholder="Short description (shown in bot store cards)" className="discord-input w-full" maxLength={120} />
            <p className="text-discord-muted text-[11px] mt-1">Max 120 chars · shown in search results</p>
          </div>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="discord-input w-full">
            {BOT_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input value={form.welcomeMessage} onChange={e => setForm(f => ({ ...f, welcomeMessage: e.target.value }))} placeholder="Welcome message" className="discord-input w-full" />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated)" className="discord-input w-full" />
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))} className={`transition-colors ${form.isPublic ? 'text-discord-brand' : 'text-discord-muted'}`}>
              {form.isPublic ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
            </button>
            <span className="text-discord-text text-sm">Public (visible in Bot Store)</span>
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="flex items-center gap-2 bg-discord-brand text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-60">
              {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiPlus size={14} />} Create Bot
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-discord-muted hover:text-discord-text border border-white/10 hover:border-white/20 transition-all">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-discord-sidebar border border-white/6 rounded-2xl animate-pulse" />)}</div>
      ) : myBots.length === 0 ? (
        <div className="text-center py-12 text-discord-muted">
          <FiCpu size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No bots yet</p>
          <p className="text-xs mt-1">Create your first bot to get a bot API key</p>
        </div>
      ) : myBots.map(bot => (
        <div key={bot._id} className="bg-discord-sidebar border border-white/8 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-discord-text text-sm">{bot.name}</span>
                <span className="text-[10px] text-discord-brand bg-discord-brand/10 px-1.5 py-0.5 rounded-md font-semibold border border-discord-brand/20">⚙️ BOT</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${bot.isPublic ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-discord-muted bg-white/4 border-white/10'}`}>{bot.isPublic ? 'Public' : 'Private'}</span>
              </div>
              <p className="text-discord-muted text-xs mt-0.5">@{bot.username} · {bot.category}</p>
              {bot.bio && <p className="text-discord-muted text-xs mt-1 line-clamp-1">{bot.bio}</p>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => handleDelete(bot._id)} className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${deleting === bot._id ? 'text-discord-red bg-discord-red/10 border-discord-red/30' : 'text-discord-muted hover:text-discord-red hover:bg-discord-red/10 border-white/8'}`}>
                <FiTrash2 size={13} />
              </button>
            </div>
          </div>
          {(bot.monthlyActiveUsers != null || bot.totalUsers != null) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-discord-muted">
              {bot.monthlyActiveUsers != null && (
                <span className="flex items-center gap-1"><FiUsers size={11} /> {bot.monthlyActiveUsers} MAU</span>
              )}
              {bot.totalUsers != null && (
                <span className="flex items-center gap-1"><FiUsers size={11} /> {bot.totalUsers} total</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SnippetsTab({ currentUser }) {
  const [subTab, setSubTab] = useState('browse');
  const [snippets, setSnippets] = useState([]);
  const [mySnippets, setMySnippets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [expandedSnippet, setExpandedSnippet] = useState(null);
  const [fullSnippet, setFullSnippet] = useState(null);
  const [loadingFull, setLoadingFull] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', language: 'javascript', code: '', tags: '', isPublic: true });
  const [creating, setCreating] = useState(false);
  const [liking, setLiking] = useState({});
  const [forking, setForking] = useState({});

  useEffect(() => {
    API.getSnippetLanguages().then(d => setLanguages(d?.languages || [])).catch(() => {});
  }, []);

  const fetchSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getSnippets({ search: search || undefined, language: langFilter || undefined, sort });
      setSnippets(Array.isArray(data) ? data : data.snippets || []);
    } catch { setSnippets([]); }
    finally { setLoading(false); }
  }, [search, langFilter, sort]);

  const fetchMySnippets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getMySnippets();
      setMySnippets(Array.isArray(data) ? data : data.snippets || []);
    } catch { setMySnippets([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (subTab === 'browse') fetchSnippets(); else if (subTab === 'mine') fetchMySnippets(); }, [subTab, fetchSnippets, fetchMySnippets]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.code.trim()) return;
    setCreating(true);
    try {
      await API.createSnippet({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
      showToast('Snippet published! +20 XP', { type: 'success' });
      setForm({ title: '', description: '', language: 'javascript', code: '', tags: '', isPublic: true });
      setSubTab('mine');
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
    finally { setCreating(false); }
  };

  const handleLike = async (snippet) => {
    setLiking(l => ({ ...l, [snippet._id]: true }));
    try {
      const data = await API.likeSnippet(snippet._id);
      setSnippets(prev => prev.map(s => s._id === snippet._id ? { ...s, isLiked: data.liked, likeCount: data.likeCount } : s));
    } catch { }
    finally { setLiking(l => ({ ...l, [snippet._id]: false })); }
  };

  const handleFork = async (snippet) => {
    setForking(f => ({ ...f, [snippet._id]: true }));
    try {
      await API.forkSnippet(snippet._id);
      showToast('Snippet forked! +10 XP', { type: 'success' });
    } catch (err) { showToast(err.message || 'Failed', { type: 'error' }); }
    finally { setForking(f => ({ ...f, [snippet._id]: false })); }
  };

  const loadFull = async (id) => {
    if (fullSnippet?._id === id) { setExpandedSnippet(null); setFullSnippet(null); return; }
    setExpandedSnippet(id);
    setLoadingFull(id);
    try {
      const data = await API.getSnippet(id);
      setFullSnippet(data.snippet || data);
    } catch { }
    finally { setLoadingFull(null); }
  };

  const LANG_COLORS = { javascript: 'text-yellow-400', typescript: 'text-blue-400', python: 'text-green-400', rust: 'text-orange-400', go: 'text-cyan-400', solidity: 'text-purple-400' };

  const SnippetCard = ({ snippet, showDelete = false }) => (
    <div className="bg-discord-sidebar border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 ${LANG_COLORS[snippet.language] || 'text-discord-muted'}`}>{snippet.language}</span>
              {snippet.tags?.slice(0,3).map(t => <span key={t} className="text-[10px] text-discord-muted bg-white/3 border border-white/8 px-1.5 py-0.5 rounded-md">#{t}</span>)}
            </div>
            <p className="font-bold text-discord-text text-sm">{snippet.title}</p>
            {snippet.description && <p className="text-discord-muted text-xs mt-0.5 line-clamp-1">{snippet.description}</p>}
            <p className="text-discord-muted text-xs mt-1">@{snippet.author?.username}</p>
          </div>
          <button onClick={() => loadFull(snippet._id)} className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${expandedSnippet === snippet._id ? 'text-discord-brand bg-discord-brand/10 border-discord-brand/20' : 'text-discord-muted border-white/10 hover:border-white/20 hover:text-discord-text'}`}>
            <FiCode size={13} />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={() => handleLike(snippet)} disabled={liking[snippet._id]} className={`flex items-center gap-1 text-xs transition-all ${snippet.isLiked ? 'text-red-400' : 'text-discord-muted hover:text-red-400'}`}>
            <FiHeart size={12} className={snippet.isLiked ? 'fill-current' : ''} /> {snippet.likeCount || 0}
          </button>
          <span className="flex items-center gap-1 text-xs text-discord-muted"><FiEye size={11} /> {snippet.viewCount || 0}</span>
          <button onClick={() => handleFork(snippet)} disabled={forking[snippet._id]} className="flex items-center gap-1 text-xs text-discord-muted hover:text-discord-brand transition-all">
            {forking[snippet._id] ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiGitMerge size={11} />} {snippet.forkCount || 0}
          </button>
          <div className="ml-auto"><CopyBtn text={snippet.code || ''} label="Copy" /></div>
        </div>
      </div>

      {expandedSnippet === snippet._id && (
        <div className="border-t border-white/8 bg-black/20">
          {loadingFull === snippet._id ? (
            <div className="flex items-center justify-center py-6"><div className="w-5 h-5 border-2 border-discord-brand border-t-transparent rounded-full animate-spin" /></div>
          ) : fullSnippet ? (
            <pre className="p-4 text-xs text-discord-text font-mono overflow-x-auto leading-relaxed max-h-80" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}><code>{fullSnippet.code}</code></pre>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-discord-hover rounded-xl p-1">
        {[['browse','Browse'],['mine','Mine'],['create','Create']].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${subTab === id ? 'bg-discord-sidebar text-discord-text shadow' : 'text-discord-muted'}`}>{label}</button>
        ))}
      </div>

      {subTab === 'browse' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[140px] relative">
              <FiSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-discord-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search snippets..." className="discord-input pl-8 w-full text-sm py-2" />
            </div>
            <select value={langFilter} onChange={e => setLangFilter(e.target.value)} className="discord-input text-sm py-2 pr-8 min-w-[120px]">
              <option value="">All languages</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="discord-input text-sm py-2 pr-8">
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="trending">Trending</option>
            </select>
          </div>
          {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-discord-sidebar border border-white/6 rounded-2xl animate-pulse" />)}</div>
            : snippets.length === 0 ? <div className="text-center py-12 text-discord-muted"><FiCode size={36} className="mx-auto mb-3 opacity-30" /><p>No snippets found</p></div>
            : <div className="space-y-3">{snippets.map(s => <SnippetCard key={s._id} snippet={s} />)}</div>}
        </>
      )}

      {subTab === 'mine' && (
        <>
          {loading ? <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-discord-sidebar border border-white/6 rounded-2xl animate-pulse" />)}</div>
            : mySnippets.length === 0 ? <div className="text-center py-12 text-discord-muted"><FiCode size={36} className="mx-auto mb-3 opacity-30" /><p>No snippets yet</p><button onClick={() => setSubTab('create')} className="mt-3 text-discord-brand text-sm hover:underline">Create your first snippet</button></div>
            : <div className="space-y-3">{mySnippets.map(s => <SnippetCard key={s._id} snippet={s} showDelete />)}</div>}
        </>
      )}

      {subTab === 'create' && (
        <form onSubmit={handleCreate} className="space-y-3">
          <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Snippet title *" className="discord-input w-full" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" className="discord-input w-full" />
          <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="discord-input w-full">
            {languages.length ? languages.map(l => <option key={l} value={l}>{l}</option>) : <option value="javascript">javascript</option>}
          </select>
          <textarea required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Paste your code here..." className="discord-input w-full font-mono text-sm resize-none" rows={10} style={{ minHeight: 180 }} />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated, max 10)" className="discord-input w-full" />
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))} className={`transition-colors ${form.isPublic ? 'text-discord-brand' : 'text-discord-muted'}`}>
              {form.isPublic ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
            </button>
            <span className="text-discord-text text-sm">Public</span>
          </label>
          <button type="submit" disabled={creating} className="flex items-center gap-2 bg-discord-brand text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-all">
            {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCode size={14} />} Publish Snippet
          </button>
        </form>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    API.getDevLeaderboard(50).then(d => setLeaders(d?.leaderboard || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const BADGE_STYLE = { junior_dev: 'text-blue-400', dev: 'text-discord-brand', senior_dev: 'text-purple-400' };

  return (
    <div className="space-y-2">
      {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-14 bg-discord-sidebar border border-white/6 rounded-xl animate-pulse" />) : leaders.length === 0 ? (
        <div className="text-center py-12 text-discord-muted"><FiAward size={36} className="mx-auto mb-3 opacity-30" /><p>No leaderboard data yet</p></div>
      ) : leaders.map(dev => (
        <div key={dev.username} onClick={() => navigate(`/profile/${dev.username}`)} className="flex items-center gap-3 bg-discord-sidebar border border-white/8 rounded-xl px-4 py-3 cursor-pointer hover:border-discord-brand/30 transition-all">
          <span className={`text-lg font-black w-8 text-center flex-shrink-0 ${dev.rank === 1 ? 'text-yellow-400' : dev.rank === 2 ? 'text-slate-300' : dev.rank === 3 ? 'text-orange-400' : 'text-discord-muted'}`}>
            {dev.rank <= 3 ? ['🥇','🥈','🥉'][dev.rank - 1] : dev.rank}
          </span>
          <div className="w-9 h-9 rounded-full bg-discord-brand/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-discord-brand/20">
            {dev.profilePicture ? <img src={dev.profilePicture} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-discord-brand">{(dev.name || dev.username || '?')[0].toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-discord-text text-sm truncate">{dev.name || dev.username}</span>
              {dev.devBadge && <span className={`text-[10px] font-bold ${BADGE_STYLE[dev.devBadge] || 'text-discord-muted'}`}>{DEV_BADGE_LABELS[dev.devBadge]}</span>}
            </div>
            <div className="flex items-center gap-2 text-xs text-discord-muted">
              <span>Lv.{dev.devLevel}</span>
              <span className="flex items-center gap-0.5"><FiBox size={9} />{dev.appCount}</span>
              <span className="flex items-center gap-0.5"><FiCpu size={9} />{dev.botCount}</span>
              <span className="flex items-center gap-0.5"><FiCode size={9} />{dev.snippetCount}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-black text-discord-brand text-sm">{dev.devXp} XP</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiZap },
  { id: 'apps',      label: 'Apps',      icon: FiBox },
  { id: 'botstore',  label: 'Bot Store', icon: FiCpu },
  { id: 'mybots',    label: 'My Bots',   icon: FiCpu },
  { id: 'snippets',  label: 'Snippets',  icon: FiCode },
  { id: 'leaderboard', label: 'Leaderboard', icon: FiAward },
];

export default function Developer({ currentUser, unreadCounts }) {
  const [tab, setTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);

  const refreshProfile = useCallback(async () => {
    try {
      API.clearCache('/api/dev');
      const data = await API.getDevProfile();
      setProfile(data);
      setApps(data.apps || []);
    } catch { }
  }, []);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  return (
    <Layout currentUser={currentUser} unreadCounts={unreadCounts}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-discord-brand/20 flex items-center justify-center border border-discord-brand/30">
            <FiCode size={18} className="text-discord-brand" />
          </div>
          <div>
            <h1 className="font-black text-discord-text text-xl leading-none">Developer Platform</h1>
            <p className="text-discord-muted text-xs mt-0.5">Build apps, bots & share snippets</p>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar mb-6 bg-discord-hover rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${tab === id ? 'bg-discord-sidebar text-discord-text shadow' : 'text-discord-muted hover:text-discord-text'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {tab === 'dashboard'   && <Dashboard profile={profile} />}
        {tab === 'apps'        && <AppsTab apps={apps} onRefresh={refreshProfile} />}
        {tab === 'botstore'    && <BotStoreTab currentUser={currentUser} />}
        {tab === 'mybots'      && <MyBotsTab onRefresh={refreshProfile} />}
        {tab === 'snippets'    && <SnippetsTab currentUser={currentUser} />}
        {tab === 'leaderboard' && <LeaderboardTab />}
      </div>
    </Layout>
  );
}
