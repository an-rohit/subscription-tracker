import { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const CATEGORIES = [
  { id: 1, name: 'OTT',     icon: '🎬' },
  { id: 2, name: 'Music',   icon: '🎵' },
  { id: 3, name: 'Gaming',  icon: '🎮' },
  { id: 4, name: 'SaaS',    icon: '💼' },
  { id: 5, name: 'News',    icon: '📰' },
  { id: 6, name: 'Fitness', icon: '💪' },
  { id: 7, name: 'Other',   icon: '📦' },
];

const POPULAR_SUBSCRIPTIONS = [
  { name: 'Netflix',          cost: 649,  billingCycle: 'monthly', categoryId: 1, domain: 'netflix.com' },
  { name: 'Spotify',          cost: 119,  billingCycle: 'monthly', categoryId: 2, domain: 'spotify.com' },
  { name: 'Amazon Prime',     cost: 299,  billingCycle: 'monthly', categoryId: 1, domain: 'amazon.com' },
  { name: 'YouTube Premium',  cost: 139,  billingCycle: 'monthly', categoryId: 1, domain: 'youtube.com' },
  { name: 'Apple Music',      cost: 99,   billingCycle: 'monthly', categoryId: 2, domain: 'apple.com' },
  { name: 'Disney+ Hotstar',  cost: 299,  billingCycle: 'monthly', categoryId: 1, domain: 'hotstar.com' },
  { name: 'Microsoft 365',    cost: 489,  billingCycle: 'monthly', categoryId: 4, domain: 'microsoft.com' },
  { name: 'Notion',           cost: '',   billingCycle: 'monthly', categoryId: 4, domain: 'notion.so' },
  { name: 'GitHub',           cost: '',   billingCycle: 'monthly', categoryId: 4, domain: 'github.com' },
  { name: 'Canva Pro',        cost: 499,  billingCycle: 'monthly', categoryId: 4, domain: 'canva.com' },
  { name: 'Duolingo Plus',    cost: 399,  billingCycle: 'monthly', categoryId: 7, domain: 'duolingo.com' },
  { name: 'Zee5',             cost: 99,   billingCycle: 'monthly', categoryId: 1, domain: 'zee5.com' },
];

/* ─────────────────────────────────────────────
   Helpers (all original logic, unchanged)
───────────────────────────────────────────── */
const getLogoUrl = (domain) => domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

const guessDomain = (name = '') => {
  const known = POPULAR_SUBSCRIPTIONS.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (known?.domain) return known.domain;
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0]
    ? `${name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0]}.com`
    : '';
};

const getNextRenewalDate = (billingCycle = 'monthly') => {
  const date = new Date();
  if (billingCycle === 'weekly')  date.setDate(date.getDate() + 7);
  else if (billingCycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
};

const parseChatDetails = (message, currentDraft = {}, expectedField = null) => {
  const text = message.trim();
  const lower = text.toLowerCase();
  const parsed = {};
  const categoryMap = { ott:1,netflix:1,hotstar:1,prime:1,spotify:2,music:2,gaming:3,steam:3,notion:4,github:4,saas:4,other:7,cult:6,fitness:6,EconomicsTimes:5,News:5 };
  Object.keys(categoryMap).forEach(key => { if (lower.includes(key)) parsed.categoryId = categoryMap[key]; });
  const categoryByName = CATEGORIES.find(c => lower.includes(c.name.toLowerCase()));
  if (categoryByName) parsed.categoryId = categoryByName.id;
  const costMatch = text.match(/(?:rs|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
  if (costMatch && expectedField !== 'nextRenewalDate') parsed.cost = costMatch[1];
  if (lower.includes('year') || lower.includes('annual')) parsed.billingCycle = 'yearly';
  else if (lower.includes('week')) parsed.billingCycle = 'weekly';
  else if (lower.includes('month')) parsed.billingCycle = 'monthly';
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) parsed.nextRenewalDate = dateMatch[0];
  if (expectedField === 'nextRenewalDate' && !dateMatch && ['yes','default','next','ok','okay'].some(w => lower.includes(w))) {
    parsed.nextRenewalDate = getNextRenewalDate(currentDraft.billingCycle);
  }
  const domainMatch = text.match(/([a-z0-9-]+\.(com|in|io|so|net|org|app|co))/i);
  if (domainMatch) parsed.domain = domainMatch[1].toLowerCase();
  if (expectedField === 'name' || !currentDraft.name) {
    const beforeCost = text.split(/\d/)[0]
      .replace(/\b(add|subscription|for|costs?|rs|inr|monthly|yearly|weekly|per|month|year|week)\b/gi, '').trim();
    if (beforeCost && beforeCost.length > 1) {
      parsed.name = beforeCost.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  if (expectedField === 'categoryId' && !parsed.categoryId) parsed.categoryId = 7;
  return parsed;
};

const getMissingDraftField = (draft) => {
  if (!draft.name) return 'name';
  if (!draft.categoryId) return 'categoryId';
  if (!Number.isFinite(Number(draft.cost)) || Number(draft.cost) <= 0) return 'cost';
  if (!draft.billingCycle) return 'billingCycle';
  if (!draft.nextRenewalDate) return 'nextRenewalDate';
  return null;
};

const getAssistantQuestion = (field, draft) => {
  switch (field) {
    case 'name':         return 'Which subscription service do you want to add?';
    case 'categoryId':   return `What category does ${draft.name} belong to?\n\nOTT, Music, Gaming, SaaS, Fitness or Other.`;
    case 'cost':         return `How much do you pay for ${draft.name}?`;
    case 'billingCycle': return `Is ${draft.name} billed monthly, yearly, or weekly?`;
    case 'nextRenewalDate': return `When is the next renewal date for ${draft.name}? (YYYY-MM-DD)`;
    default: return 'Everything looks ready. Review and save it.';
  }
};

const emptyForm = { name:'', cost:'', billingCycle:'monthly', nextRenewalDate:'', categoryId:'', currency:'INR', status:'active', domain:'' };
const emptyChatDraft = { ...emptyForm, billingCycle:'' };
const notifyReminderRefresh = () => window.dispatchEvent(new Event('subscription-reminders:refresh'));

const getDaysUntilRenewal = (date) => {
  if (!date) return null;
  const today = new Date(); const renewal = new Date(date);
  today.setHours(0,0,0,0); renewal.setHours(0,0,0,0);
  return Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
};

const getRenewUrl = (domain) => {
  if (!domain) return null;
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
};

/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
const SubscriptionLogo = ({ domain, name }) => {
  const [error, setError] = useState(false);
  if (!domain || error) {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '12px',
        background: 'var(--gradient-brand)',
        color: '#fff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 800, fontSize: '16px', flexShrink: 0,
      }}>
        {name?.[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={getLogoUrl(domain)} alt={name} onError={() => setError(true)}
      style={{
        width: 40, height: 40, borderRadius: '12px', objectFit: 'contain',
        flexShrink: 0, background: 'var(--surface-soft)',
        border: '1px solid var(--border)', padding: '3px',
      }}
    />
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    active:    'badge badge-success',
    detected:  'badge badge-primary',
    expired:   'badge badge-danger',
    paused:    'badge badge-warning',
    cancelled: 'badge badge-muted',
  };
  return <span className={map[status] || 'badge badge-muted'}>{status}</span>;
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.01em' }}>
      {label}
    </label>
    {children}
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(emptyForm);
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [nlInput, setNlInput]             = useState('');
  const [showAiChat, setShowAiChat]       = useState(false);
  const [chatInput, setChatInput]         = useState('');
  const [chatDraft, setChatDraft]         = useState(emptyChatDraft);
  const [chatLoading, setChatLoading]     = useState(false);
  const [chatMessages, setChatMessages]   = useState([
    { role: 'assistant', text: 'Tell me what subscription you want to add. You can say something like: Netflix 499 monthly.' },
  ]);

  useEffect(() => { fetchSubscriptions(); }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions);
    } catch { toast.error('Failed to load subscriptions'); }
    finally  { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cost = Number(form.cost);
    if (!Number.isFinite(cost) || cost <= 0) { toast.error('Cost must be a positive amount'); return; }
    try {
      if (editingId) { await api.put(`/subscriptions/${editingId}`, form); toast.success('Subscription updated!'); }
      else           { await api.post('/subscriptions', form);            toast.success('Subscription added!'); }
      setShowModal(false); setForm(emptyForm); setEditingId(null);
      fetchSubscriptions(); notifyReminderRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
  };

  const handleEdit = (sub) => {
    setForm({ name: sub.name, cost: sub.cost, billingCycle: sub.billingCycle, nextRenewalDate: sub.nextRenewalDate?.split('T')[0], categoryId: sub.categoryId || '', currency: sub.currency, status: sub.status, domain: sub.domain || '' });
    setEditingId(sub.id); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return;
    try { await api.delete(`/subscriptions/${id}`); toast.success('Subscription deleted'); fetchSubscriptions(); notifyReminderRefresh(); }
    catch { toast.error('Failed to delete'); }
  };

  const openAiChat = () => {
    setShowAiChat(true); setChatInput(''); setChatDraft(emptyChatDraft);
    setChatMessages([{ role: 'assistant', text: 'Tell me what subscription you want to add.' }]);
  };

  const mergeChatDraft = (current, incoming) => {
    const clean = { ...incoming };
    if (current.name && clean.name) delete clean.name;
    if (current.cost && clean.cost) delete clean.cost;
    if (current.billingCycle && clean.billingCycle) delete clean.billingCycle;
    if (current.nextRenewalDate && clean.nextRenewalDate) delete clean.nextRenewalDate;
    if (!Number.isFinite(Number(clean.cost)) || Number(clean.cost) <= 0) delete clean.cost;
    const next = { ...current, ...clean };
    if (next.name && !next.domain) next.domain = guessDomain(next.name);
    next.currency = next.currency || 'INR';
    next.status   = next.status   || 'active';
    return next;
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);
    const expectedField = getMissingDraftField(chatDraft);
    let parsed = parseChatDetails(message, chatDraft, expectedField);
    if (!chatDraft.name) {
      try {
        const res = await api.post('/ai/parse-subscription', { text: message });
        parsed = { ...res.data.parsed, ...parsed };
        if (!/(month|monthly|year|yearly|annual|week|weekly)/i.test(message)) { delete parsed.billingCycle; delete parsed.nextRenewalDate; }
      } catch { /* local parser keeps chat useful */ }
    }
    const nextDraft = mergeChatDraft(chatDraft, parsed);
    const missing = getMissingDraftField(nextDraft);
    setChatDraft(nextDraft);
    setChatMessages(prev => [...prev, { role: 'assistant', text: missing ? getAssistantQuestion(missing, nextDraft) : 'Great, I have everything. Check the preview and tap Save subscription.' }]);
    setChatLoading(false);
  };

  const handleChatSave = async () => {
    const missing = getMissingDraftField(chatDraft);
    if (missing) { setChatMessages(prev => [...prev, { role: 'assistant', text: getAssistantQuestion(missing, chatDraft) }]); return; }
    try {
      await api.post('/subscriptions', chatDraft);
      toast.success('Subscription added from AI chat!');
      setShowAiChat(false); setChatDraft(emptyChatDraft); fetchSubscriptions(); notifyReminderRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not add subscription'); }
  };

  const filtered = subscriptions.filter(sub => {
    const isInvalidDetected = sub.status === 'detected' && Number(sub.cost) <= 0;
    if (isInvalidDetected) return false;
    const matchSearch = sub.name.toLowerCase().includes(search.toLowerCase());
    const isExpired = getDaysUntilRenewal(sub.nextRenewalDate) < 0 && ['active','detected'].includes(sub.status);
    const matchStatus = filterStatus === 'expired' ? sub.status === 'expired' || isExpired : filterStatus ? sub.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  /* ── Skeleton loading ── */
  if (loading) return (
    <div className="app-shell">
      {/* Header skeleton */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 32px', marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: 240, height: 32, borderRadius: 8, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: 180, height: 16, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skeleton" style={{ width: 120, height: 42, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 160, height: 42, borderRadius: 12 }} />
        </div>
      </div>

      {/* Grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 4 }} />
              </div>
            </div>
            <div className="skeleton" style={{ width: '45%', height: 32, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '30%', height: 12, borderRadius: 4, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 10 }} />
              <div className="skeleton" style={{ flex: 1, height: 36, borderRadius: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-shell">

      {/* ══ Page Header ══ */}
      <Motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 24, padding: '28px 32px',
          borderRadius: 24,
          background: 'var(--gradient-panel), var(--surface-raised)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
          gap: 16, flexWrap: 'wrap', position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Subscription library
          </p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            Subscriptions
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
            {subscriptions.length} total subscriptions tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <Motion.button
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={openAiChat}
            style={{
              background: 'linear-gradient(135deg, #059669, #0f766e)', color: '#fff',
              padding: '10px 18px', fontWeight: 700, border: 'none', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 6px 18px color-mix(in srgb, var(--success) 28%, transparent)',
            }}
          >
            <SparkleIcon />AI Chat Add
          </Motion.button>
          <Motion.button
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}
            style={{
              background: 'var(--gradient-brand)', color: '#fff',
              padding: '10px 18px', fontWeight: 700, border: 'none', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 6px 18px var(--primary-glow)',
            }}
          >
            <PlusIcon />Add Subscription
          </Motion.button>
        </div>
      </Motion.div>

      {/* ══ AI Quick Entry Banner ══ */}
      <Motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #3730a3 52%, #0f766e 100%)',
          borderRadius: 20, padding: '22px 24px', marginBottom: 24,
          display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 12px 36px rgba(79,70,229,0.22)',
          border: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <SparkleIcon />
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 700 }}>AI guided add</p>
          </div>
          <input
            placeholder='Type "Netflix 499 monthly" and press Enter, or click Open Chat'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { openAiChat(); setChatInput(nlInput); } }}
            style={{
              background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', borderRadius: 12, minWidth: 'min(100%, 380px)',
            }}
          />
        </div>
        <Motion.button
          whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
          onClick={() => { openAiChat(); setChatInput(nlInput); }}
          style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            padding: '11px 20px', border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 12, fontWeight: 700, marginTop: 24,
          }}
        >
          Open Chat
        </Motion.button>
      </Motion.div>

      {/* ══ Search & Filter ══ */}
      <Motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}
        style={{
          display: 'flex', gap: 12, marginBottom: 24, padding: '12px 14px',
          background: 'var(--surface-raised)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--shadow)', flexWrap: 'wrap', alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', display: 'flex', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
          <input
            placeholder="Search subscriptions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 175 }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="detected">Detected</option>
          <option value="expired">Expired</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || filterStatus) && (
          <Motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setSearch(''); setFilterStatus(''); }}
            style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}
          >
            Clear
          </Motion.button>
        )}
        <span style={{ color: 'var(--text-subtle)', fontSize: 13, marginLeft: 'auto' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </Motion.div>

      {/* ══ Subscription Cards Grid ══ */}
      <AnimatePresence>
        {filtered.length === 0 ? (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              textAlign: 'center', padding: '72px 24px',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              borderRadius: 20, boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>
              No subscriptions found
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              Try a different search or add a new subscription.
            </p>
            <Motion.button
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}
              style={{ background: 'var(--gradient-brand)', color: '#fff', padding: '11px 24px', borderRadius: 12, fontWeight: 700, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <PlusIcon />Add your first subscription
            </Motion.button>
          </Motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map((sub, i) => {
              const daysUntilRenewal = getDaysUntilRenewal(sub.nextRenewalDate);
              const isExpired = sub.status === 'expired' || (daysUntilRenewal < 0 && ['active','detected'].includes(sub.status));
              const renewUrl  = getRenewUrl(sub.domain);
              const urgencyColor = isExpired ? 'var(--danger)' : daysUntilRenewal <= 7 ? 'var(--warning)' : 'var(--border)';

              return (
                <Motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -5, boxShadow: 'var(--shadow-strong)' }}
                  style={{
                    background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
                    borderRadius: 20, padding: 20,
                    border: isExpired ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                    backdropFilter: 'blur(18px)',
                    position: 'relative', overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Top urgency bar */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: urgencyColor, borderRadius: '20px 20px 0 0' }} />

                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <SubscriptionLogo domain={sub.domain} name={sub.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</p>
                      <p style={{ fontSize: 12, color: isExpired ? 'var(--danger)' : 'var(--text-subtle)', marginTop: 3, fontWeight: isExpired ? 700 : 500 }}>
                        {isExpired ? `Expired ${Math.abs(daysUntilRenewal)} day${Math.abs(daysUntilRenewal) === 1 ? '' : 's'} ago` : sub.category?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>

                  {/* Cost */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                      Rs {sub.cost}
                      <span style={{ fontSize: 13, color: 'var(--text-subtle)', fontWeight: 500, fontFamily: 'inherit' }}>/{sub.billingCycle}</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
                      {isExpired ? '⚠️ Expired' : `🔄 Renews`} {new Date(sub.nextRenewalDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isExpired && renewUrl && (
                      <Motion.a
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        href={renewUrl} target="_blank" rel="noreferrer"
                        style={{
                          flex: 1, background: 'var(--gradient-brand)', color: '#fff',
                          padding: '9px 10px', fontWeight: 800, borderRadius: 10,
                          textDecoration: 'none', textAlign: 'center', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        Renew
                      </Motion.a>
                    )}
                    <Motion.button
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleEdit(sub)}
                      style={{
                        flex: 1, background: 'var(--surface-muted)', color: 'var(--text)',
                        padding: '9px 10px', fontWeight: 700, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13,
                      }}
                    >
                      <EditIcon />Edit
                    </Motion.button>
                    <Motion.button
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleDelete(sub.id)}
                      style={{
                        flex: 1, background: 'var(--danger-soft)', color: 'var(--danger)',
                        padding: '9px 10px', fontWeight: 700, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13,
                      }}
                    >
                      <TrashIcon />Delete
                    </Motion.button>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ══ AI Chat Modal ══ */}
      <AnimatePresence>
        {showAiChat && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20, backdropFilter: 'blur(6px)' }}
            onClick={e => e.target === e.currentTarget && setShowAiChat(false)}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              style={{
                width: '100%', maxWidth: 800, maxHeight: '90vh',
                background: 'var(--surface-raised)', border: '1px solid var(--border)',
                borderRadius: 20, boxShadow: 'var(--shadow-strong)',
                overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr',
              }}
            >
              {/* Chat panel */}
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <SparkleIcon />
                      </div>
                      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800 }}>AI Add Subscription</h2>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                      I'll ask for what's missing and prepare it for you.
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowAiChat(false)}
                    style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloseIcon />
                  </button>
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
                  padding: 14, background: 'var(--surface-soft)', borderRadius: 14, border: '1px solid var(--border)',
                }}>
                  {chatMessages.map((msg, idx) => (
                    <Motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: msg.role === 'user' ? 'var(--gradient-brand)' : 'var(--surface)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                        borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
                        boxShadow: msg.role === 'user' ? '0 4px 12px var(--primary-glow)' : 'none',
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {msg.text}
                    </Motion.div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 6, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px' }}>
                      {[0,1,2].map(i => (
                        <Motion.span key={i} animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, delay: i*0.15, duration: 0.6 }}
                          style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'block' }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <input
                    placeholder="Type: Netflix 499 monthly"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                    style={{ flex: 1 }}
                  />
                  <Motion.button
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                    type="button" onClick={handleChatSend} disabled={chatLoading}
                    style={{ background: 'var(--gradient-brand)', color: '#fff', padding: '10px 18px', fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    <SendIcon />Send
                  </Motion.button>
                </div>
              </div>

              {/* Preview panel */}
              <div style={{ padding: 24, background: 'var(--surface-soft)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                  Live preview
                </p>
                <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                    <SubscriptionLogo domain={chatDraft.domain} name={chatDraft.name || 'S'} />
                    <div>
                      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800 }}>{chatDraft.name || 'Service name'}</p>
                      <p style={{ color: 'var(--text-subtle)', fontSize: 12, marginTop: 2 }}>{chatDraft.domain || 'Domain will appear here'}</p>
                    </div>
                  </div>
                  {[
                    ['Category', CATEGORIES.find(c => c.id === Number(chatDraft.categoryId))?.name || '—'],
                    ['Cost',     chatDraft.cost ? `Rs ${chatDraft.cost}` : '—'],
                    ['Cycle',    chatDraft.billingCycle || '—'],
                    ['Renewal',  chatDraft.nextRenewalDate || '—'],
                    ['Status',   chatDraft.status || 'active'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid var(--border-soft)', gap: 8 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
                      <strong style={{ fontSize: 13, color: value === '—' ? 'var(--text-subtle)' : 'var(--text)', textAlign: 'right' }}>{value}</strong>
                    </div>
                  ))}
                </div>
                <Motion.button
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  type="button" onClick={handleChatSave}
                  disabled={Boolean(getMissingDraftField(chatDraft))}
                  style={{
                    width: '100%', marginTop: 14,
                    background: getMissingDraftField(chatDraft) ? 'var(--surface-muted)' : 'linear-gradient(135deg, #059669, #0f766e)',
                    color: getMissingDraftField(chatDraft) ? 'var(--text-muted)' : '#fff',
                    padding: '12px', fontWeight: 700, borderRadius: 12, border: 'none',
                  }}
                >
                  Save subscription
                </Motion.button>
                <button
                  type="button"
                  onClick={() => { setForm({ ...emptyForm, ...chatDraft }); setEditingId(null); setShowAiChat(false); setShowModal(true); }}
                  style={{ width: '100%', marginTop: 10, background: 'var(--surface-muted)', color: 'var(--text)', padding: '11px', fontWeight: 700, borderRadius: 12, border: 'none' }}
                >
                  Edit in form
                </button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ══ Add / Edit Modal ══ */}
      <AnimatePresence>
        {showModal && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, backdropFilter: 'blur(6px)' }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{
                background: 'var(--surface-raised)', borderRadius: 20, padding: 32,
                width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
                border: '1px solid var(--border)', boxShadow: 'var(--shadow-strong)',
              }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {editingId ? 'Edit Subscription' : 'Add Subscription'}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    {editingId ? 'Update the details below' : 'Fill in your subscription details'}
                  </p>
                </div>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CloseIcon />
                </button>
              </div>

              {/* Quick Select Popular */}
              {!editingId && (
                <div style={{ marginBottom: 22 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ⚡ Quick Add Popular
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, maxHeight: 170, overflowY: 'auto' }}>
                    {POPULAR_SUBSCRIPTIONS.map((sub, i) => (
                      <Motion.button
                        key={i} type="button"
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                        onClick={() => setForm({ ...emptyForm, name: sub.name, cost: sub.cost, billingCycle: sub.billingCycle, categoryId: sub.categoryId, domain: sub.domain, nextRenewalDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] })}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                          padding: '10px 4px',
                          background: form.name === sub.name ? 'var(--primary-soft)' : 'var(--surface-soft)',
                          border: form.name === sub.name ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 12,
                        }}
                      >
                        <img src={getLogoUrl(sub.domain)} alt={sub.name} onError={e => { e.target.style.display = 'none'; }} style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'contain' }} />
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{sub.name}</span>
                      </Motion.button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <FormField label="Service Name">
                  <input placeholder="Netflix, Spotify..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </FormField>

                <FormField label="Website Domain (for logo)">
                  <input placeholder="e.g. netflix.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
                  {form.domain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <img src={getLogoUrl(form.domain)} alt="logo preview" style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--surface-soft)', padding: 2 }} onError={e => e.target.style.display = 'none'} />
                      <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Logo preview</span>
                    </div>
                  )}
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <FormField label="Cost (₹)">
                    <input type="number" min="0.01" step="0.01" placeholder="499" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} required />
                  </FormField>
                  <FormField label="Billing Cycle">
                    <select value={form.billingCycle} onChange={e => setForm({ ...form, billingCycle: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </FormField>
                </div>

                <FormField label="Next Renewal Date">
                  <input type="date" value={form.nextRenewalDate} min={new Date().toISOString().split('T')[0]} onChange={e => setForm({ ...form, nextRenewalDate: e.target.value })} required />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <FormField label="Category">
                    <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Status">
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </FormField>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <Motion.button
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    type="button" onClick={() => setShowModal(false)}
                    style={{ flex: 1, background: 'var(--surface-muted)', color: 'var(--text)', padding: '12px', borderRadius: 12 }}
                  >
                    Cancel
                  </Motion.button>
                  <Motion.button
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ flex: 1, background: 'var(--gradient-brand)', color: '#fff', padding: '12px', borderRadius: 12, fontWeight: 700, border: 'none', boxShadow: '0 6px 18px var(--primary-glow)' }}
                  >
                    {editingId ? 'Update Subscription' : 'Add Subscription'}
                  </Motion.button>
                </div>
              </form>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
