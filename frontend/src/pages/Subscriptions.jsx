import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 1, name: 'OTT', icon: '🎬' },
  { id: 2, name: 'Music', icon: '🎵' },
  { id: 3, name: 'Gaming', icon: '🎮' },
  { id: 4, name: 'SaaS', icon: '💼' },
  { id: 5, name: 'News', icon: '📰' },
  { id: 6, name: 'Fitness', icon: '💪' },
  { id: 7, name: 'Other', icon: '📦' },
];

const POPULAR_SUBSCRIPTIONS = [
  { name: 'Netflix', cost: 649, billingCycle: 'monthly', categoryId: 1, domain: 'netflix.com' },
  { name: 'Spotify', cost: 119, billingCycle: 'monthly', categoryId: 2, domain: 'spotify.com' },
  { name: 'Amazon Prime', cost: 299, billingCycle: 'monthly', categoryId: 1, domain: 'amazon.com' },
  { name: 'YouTube Premium', cost: 139, billingCycle: 'monthly', categoryId: 1, domain: 'youtube.com' },
  { name: 'Apple Music', cost: 99, billingCycle: 'monthly', categoryId: 2, domain: 'apple.com' },
  { name: 'Disney+ Hotstar', cost: 299, billingCycle: 'monthly', categoryId: 1, domain: 'hotstar.com' },
  { name: 'Microsoft 365', cost: 489, billingCycle: 'monthly', categoryId: 4, domain: 'microsoft.com' },
  { name: 'Notion', cost: '', billingCycle: 'monthly', categoryId: 4, domain: 'notion.so' },
  { name: 'GitHub', cost: '', billingCycle: 'monthly', categoryId: 4, domain: 'github.com' },
  { name: 'Canva Pro', cost: 499, billingCycle: 'monthly', categoryId: 4, domain: 'canva.com' },
  { name: 'Duolingo Plus', cost: 399, billingCycle: 'monthly', categoryId: 7, domain: 'duolingo.com' },
  { name: 'Zee5', cost: 99, billingCycle: 'monthly', categoryId: 1, domain: 'zee5.com' },
];

// Helper to get logo URL
const getLogoUrl = (domain) => {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

const guessDomain = (name = '') => {
  const known = POPULAR_SUBSCRIPTIONS.find(sub =>
    sub.name.toLowerCase() === name.toLowerCase()
  );
  if (known?.domain) return known.domain;

  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)[0]
    ? `${name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)[0]}.com`
    : '';
};

const getNextRenewalDate = (billingCycle = 'monthly') => {
  const date = new Date();
  if (billingCycle === 'weekly') date.setDate(date.getDate() + 7);
  else if (billingCycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
};

const parseChatDetails = (message, currentDraft = {}) => {

  const text = message.trim();
  const lower = text.toLowerCase();
  const parsed = {};

  const categoryMap = {
    ott: 1,
    netflix: 1,
    hotstar: 1,
    prime: 1,
    spotify: 2,
    music: 2,
    gaming: 3,
    steam: 3,
    notion: 4,
    github: 4,
    saas: 4,
    other: 7,
    cult: 6,
    fitness: 6,
    EconomicsTimes:5,
    News:5,
  };

  Object.keys(categoryMap).forEach(key => {
    if (lower.includes(key)) {
      parsed.categoryId = categoryMap[key];
    }
  });

  const costMatch = text.match(/(?:rs|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
  if (costMatch) parsed.cost = costMatch[1];

  if (lower.includes('year') || lower.includes('annual')) {
    parsed.billingCycle = 'yearly';
  }
  else if (lower.includes('week')) {
    parsed.billingCycle = 'weekly';
  }
  else if (lower.includes('month')) {
    parsed.billingCycle = 'monthly';
  }

  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) parsed.nextRenewalDate = dateMatch[0];

  const domainMatch = text.match(/([a-z0-9-]+\.(com|in|io|so|net|org|app|co))/i);
  if (domainMatch) parsed.domain = domainMatch[1].toLowerCase();

  if (!currentDraft.name) {
    const beforeCost = text
      .split(/\d/)[0]
      .replace(/\b(add|subscription|for|costs?|rs|inr|monthly|yearly|weekly|per|month|year|week)\b/gi, '')
      .trim();

    if (beforeCost && beforeCost.length > 1) {
      parsed.name = beforeCost
        .split(/\s+/)
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');
    }
  }

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
    case 'name':
      return 'Which subscription service do you want to add?';

    case 'categoryId':
      return `What category does ${draft.name} belong to?\n\nOTT, Music, Gaming, SaaS, Fitness or Other.`;

    case 'cost':
      return `How much do you pay for ${draft.name}?`;

    case 'billingCycle':
      return `Is ${draft.name} billed monthly, yearly, or weekly?`;

    case 'nextRenewalDate':
      return `When is the next renewal date for ${draft.name}? (YYYY-MM-DD)`;

    default:
      return 'Everything looks ready. Review and save it.';
  }
};

const emptyForm = {
  name: '',
  cost: '',
  billingCycle: '',
  nextRenewalDate: '',
  categoryId: '',
  currency: 'INR',
  status: 'active',
  domain: '',
};

const SubscriptionLogo = ({ domain, name }) => {
  const [error, setError] = useState(false);

  if (!domain || error) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '8px',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: '16px', flexShrink: 0,
      }}>
        {name?.[0]?.toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={getLogoUrl(domain)}
      alt={name}
      onError={() => setError(true)}
      style={{
        width: 36, height: 36, borderRadius: '8px',
        objectFit: 'contain', flexShrink: 0,
        background: 'var(--surface-soft)', padding: '2px',
      }}
    />
  );
};

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [nlInput, setNlInput] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatDraft, setChatDraft] = useState(emptyForm);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Tell me what subscription you want to add. You can say something like: Netflix 499 monthly.' },
  ]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data.subscriptions);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cost = Number(form.cost);
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error('Cost must be a positive amount');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/subscriptions/${editingId}`, form);
        toast.success('Subscription updated!');
      } else {
        await api.post('/subscriptions', form);
        toast.success('Subscription added!');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleEdit = (sub) => {
  setForm({
    name: sub.name,
    cost: sub.cost,
    billingCycle: sub.billingCycle,
    nextRenewalDate: sub.nextRenewalDate?.split('T')[0],
    categoryId: sub.categoryId || '',
    currency: sub.currency,
    status: sub.status,
    domain: sub.domain || '',
  });
  setEditingId(sub.id);
  setShowModal(true);
};

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      toast.success('Subscription deleted');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleNLParse = async () => {
  if (!nlInput.trim()) return;
  setNlLoading(true);
  try {
    const res = await api.post('/ai/parse-subscription', { text: nlInput });
    setForm({ ...emptyForm, ...res.data.parsed, categoryId: '' });
    setShowModal(true);
    setNlInput('');
    if (res.data.fallback) {
      toast('AI was busy — used smart fallback. Please review!', { icon: '⚠️' });
    } else {
      toast.success('Subscription parsed! Review and save.');
    }
  } catch (err) {
    toast.error('Could not parse. Opening manual form...');
    setForm({ ...emptyForm, name: nlInput });
    setShowModal(true);
    setNlInput('');
  } finally {
    setNlLoading(false);
  }
};

  const openAiChat = () => {
    setShowAiChat(true);
    setChatInput('');
    setChatDraft(emptyForm);
    setChatMessages([
      { role: 'assistant', text: 'Tell me what subscription you want to add.' },
    ]);
  };

  const mergeChatDraft = (current, incoming) => {
    const cleanIncoming = { ...incoming };
    if (current.name && cleanIncoming.name) delete cleanIncoming.name;
    const next = { ...current, ...cleanIncoming };
    if (next.name && !next.domain) next.domain = guessDomain(next.name);
    // if (next.billingCycle && !next.nextRenewalDate) {
    //   next.nextRenewalDate = getNextRenewalDate(next.billingCycle);
    // }
    next.currency = next.currency || 'INR';
    next.status = next.status || 'active';
    return next;
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setChatLoading(true);

    let parsed = parseChatDetails(message, chatDraft);

    try {
      const res = await api.post('/ai/parse-subscription', { text: message });
      parsed = { ...parsed, ...res.data.parsed };
    } catch (err) {
      // Local guided parser keeps the chat useful even when AI is unavailable.
    }

    const nextDraft = mergeChatDraft(chatDraft, parsed);
    const missing = getMissingDraftField(nextDraft);

    setChatDraft(nextDraft);
    setChatMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        text: missing
          ? getAssistantQuestion(missing, nextDraft)
          : 'Great, I have everything. Check the preview ,add the respective category and tap Save subscription.',
      },
    ]);
    setChatLoading(false);
  };

  const handleChatSave = async () => {
    const missing = getMissingDraftField(chatDraft);
    if (missing) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: getAssistantQuestion(missing, chatDraft) }]);
      return;
    }

    try {
      await api.post('/subscriptions', chatDraft);
      toast.success('Subscription added from AI chat!');
      setShowAiChat(false);
      setChatDraft(emptyForm);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add subscription');
    }
  };

  const filtered = subscriptions.filter(sub => {
    const matchSearch = sub.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? sub.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const statusColor = (status) => {
    if (status === 'active') return { bg: '#d1fae5', color: '#065f46' };
    if (status === 'paused') return { bg: '#fef3c7', color: '#92400e' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };

  if (loading) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '80vh',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: 'min(360px, 100%)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            ₹
          </motion.div>
          <div style={{ flex: 1 }}>
            <motion.div
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              style={{ height: 12, width: '70%', background: 'var(--primary-soft)', borderRadius: '999px', marginBottom: '8px' }}
            />
            <motion.div
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut', delay: 0.12 }}
              style={{ height: 10, width: '45%', background: '#dcfce7', borderRadius: '999px' }}
            />
          </div>
        </div>
        {[0, 1, 2].map((item) => (
          <motion.div
            key={item}
            animate={{ x: [0, 8, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ repeat: Infinity, duration: 1.7, ease: 'easeInOut', delay: item * 0.15 }}
            style={{
              height: 12,
              width: `${88 - item * 14}%`,
              background: item === 1 ? 'var(--primary-soft)' : 'var(--surface-muted)',
              borderRadius: '999px',
              marginTop: '10px',
            }}
          />
        ))}
      </motion.div>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700 }}>💳 Subscriptions</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '14px' }}>
            {subscriptions.length} total subscriptions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAiChat}
            style={{ background: '#10b981', color: '#fff', padding: '10px 18px' }}
          >
            AI Chat Add
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}
            style={{ background: '#6366f1', color: '#fff', padding: '10px 20px' }}
          >
            + Add Subscription
          </motion.button>
        </div>
      </motion.div>

      {/* AI Chat Entry */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #10b981 100%)',
          borderRadius: '16px',
          padding: '22px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 18px 40px rgba(79,70,229,0.22)',
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
            AI guided add
          </p>
          <input
            placeholder='Click Open Chat, or type "Netflix 499 monthly" and press Enter'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                openAiChat();
                setChatInput(nlInput);
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: '8px',
            }}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            openAiChat();
            setChatInput(nlInput);
          }}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '10px 20px',
            border: '1px solid rgba(255,255,255,0.3)',
            marginTop: '24px',
          }}
        >
          Open Chat
        </motion.button>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}
      >
        <input
          placeholder="🔍 Search subscriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </motion.div>

      {/* Subscriptions Grid */}
      <AnimatePresence>
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px', color: 'var(--text-subtle)' }}
          >
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
            <p style={{ fontSize: '16px' }}>No subscriptions found</p>
          </motion.div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {filtered.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
  <SubscriptionLogo domain={sub.domain} name={sub.name} />
  <div>
    <p style={{ fontWeight: 600, fontSize: '16px' }}>{sub.name}</p>
    <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}>
      {sub.category?.name || 'Uncategorized'}
    </p>
  </div>
  <span style={{
    marginLeft: 'auto',
    ...statusColor(sub.status),
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  }}>
    {sub.status}
  </span>
</div>

                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#6366f1' }}>
                    ₹{sub.cost}
                    <span style={{ fontSize: '14px', color: 'var(--text-subtle)', fontWeight: 400 }}>
                      /{sub.billingCycle}
                    </span>
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                    🔄 Renews: {new Date(sub.nextRenewalDate).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(sub)}
                    style={{ flex: 1, background: 'var(--surface-muted)', color: 'var(--text)', padding: '8px' }}
                  >
                    ✏️ Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(sub.id)}
                    style={{ flex: 1, background: '#fee2e2', color: '#dc2626', padding: '8px' }}
                  >
                    🗑️ Delete
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showAiChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.58)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
            onClick={(e) => e.target === e.currentTarget && setShowAiChat(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              style={{
                width: '100%',
                maxWidth: '780px',
                maxHeight: '90vh',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '18px',
                boxShadow: 'var(--shadow)',
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
              }}
            >
              <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', minHeight: '560px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 850 }}>AI Add Subscription</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                      I will ask what is missing and prepare the subscription for you.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAiChat(false)}
                    style={{ background: 'var(--surface-muted)', color: 'var(--text)', width: 36, height: 36 }}
                  >
                    x
                  </button>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px',
                  background: 'var(--surface-soft)',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                }}>
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: message.role === 'user' ? '#6366f1' : 'var(--surface)',
                        color: message.role === 'user' ? '#fff' : 'var(--text)',
                        border: message.role === 'user' ? 'none' : '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                        fontSize: '14px',
                        lineHeight: 1.45,
                      }}
                    >
                      {message.text}
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Thinking...</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <input
                    placeholder="Type: Netflix 499 monthly"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                  />
                  <button
                    type="button"
                    onClick={handleChatSend}
                    disabled={chatLoading}
                    style={{ background: '#6366f1', color: '#fff', padding: '10px 16px', fontWeight: 800 }}
                  >
                    Send
                  </button>
                </div>
              </div>

              <div style={{ padding: '22px', background: 'var(--surface-soft)', borderLeft: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>
                  Live preview
                </p>
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <SubscriptionLogo domain={chatDraft.domain} name={chatDraft.name || 'S'} />
                    <div>
                      <p style={{ fontSize: '18px', fontWeight: 850 }}>{chatDraft.name || 'Service name'}</p>
                      <p style={{ color: 'var(--text-subtle)', fontSize: '12px' }}>
                        {chatDraft.domain || 'Logo domain will appear here'}
                      </p>
                    </div>
                  </div>

                  {[
                    ['Cost', chatDraft.cost ? `Rs ${chatDraft.cost}` : 'Needed'],
                    ['Cycle', chatDraft.billingCycle || 'Needed'],
                    ['Next renewal', chatDraft.nextRenewalDate || 'Needed'],
                    ['Status', chatDraft.status || 'active'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-soft)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
                      <strong style={{ fontSize: '13px', textAlign: 'right' }}>{value}</strong>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleChatSave}
                  disabled={Boolean(getMissingDraftField(chatDraft))}
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    background: getMissingDraftField(chatDraft) ? 'var(--surface-muted)' : '#10b981',
                    color: getMissingDraftField(chatDraft) ? 'var(--text-muted)' : '#fff',
                    padding: '12px',
                    fontWeight: 850,
                  }}
                >
                  Save subscription
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...emptyForm, ...chatDraft });
                    setEditingId(null);
                    setShowAiChat(false);
                    setShowModal(true);
                  }}
                  style={{ width: '100%', marginTop: '10px', background: 'var(--surface-muted)', color: 'var(--text)', padding: '12px', fontWeight: 750 }}
                >
                  Edit in form
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                padding: '32px',
                width: '100%',
                maxWidth: '480px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
  {editingId ? '✏️ Edit Subscription' : '➕ Add Subscription'}
</h2>

{/* Quick Select Popular */}
{!editingId && (
  <div style={{ marginBottom: '20px' }}>
    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 500 }}>
      ⚡ Quick Add Popular
    </p>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      maxHeight: '160px',
      overflowY: 'auto',
    }}>
      {POPULAR_SUBSCRIPTIONS.map((sub, i) => (
        <motion.button
          key={i}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setForm({
            ...emptyForm,
            name: sub.name,
            cost: sub.cost,
            billingCycle: sub.billingCycle,
            categoryId: sub.categoryId,
            domain: sub.domain,
            nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0],
          })}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 4px',
            background: form.name === sub.name ? 'var(--primary-soft)' : 'var(--surface-soft)',
            border: form.name === sub.name ? '2px solid var(--primary)' : '1px solid var(--border)',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
        >
          <img
            src={getLogoUrl(sub.domain)}
            alt={sub.name}
            onError={e => { e.target.style.display = 'none'; }}
            style={{ width: 28, height: 28, borderRadius: '6px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
            {sub.name}
          </span>
        </motion.button>
      ))}
    </div>
  </div>    
)}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                    Service Name
                  </label>
                  <input
                    placeholder="Netflix, Spotify..."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
    Website Domain (for logo)
  </label>
  <input
    placeholder="e.g. netflix.com, spotify.com"
    value={form.domain}
    onChange={e => setForm({ ...form, domain: e.target.value })}
  />
  {form.domain && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
      <img
  src={getLogoUrl(form.domain)}
  alt="logo preview"
  style={{ width: 24, height: 24, borderRadius: '4px', background: 'var(--surface-soft)', padding: '2px' }}
  onError={e => e.target.style.display = 'none'}
/>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logo preview</span>
    </div>
  )}
</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                      Cost (₹)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="499"
                      value={form.cost}
                      onChange={e => setForm({ ...form, cost: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                      Billing Cycle
                    </label>
                    <select
                      value={form.billingCycle}
                      onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                    Next Renewal Date
                  </label>
                  <input
  type="date"
  value={form.nextRenewalDate}
  min={new Date().toISOString().split('T')[0]}
  onChange={e => setForm({ ...form, nextRenewalDate: e.target.value })}
  required
/>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                      Category
                    </label>
                    <select
                      value={form.categoryId}
                      onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ flex: 1, background: 'var(--surface-muted)', color: 'var(--text)', padding: '12px' }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={{ flex: 1, background: '#6366f1', color: '#fff', padding: '12px' }}
                  >
                    {editingId ? 'Update' : 'Add Subscription'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
