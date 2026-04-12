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
  { name: 'Notion', cost: 0, billingCycle: 'monthly', categoryId: 4, domain: 'notion.so' },
  { name: 'GitHub', cost: 0, billingCycle: 'monthly', categoryId: 4, domain: 'github.com' },
  { name: 'Canva Pro', cost: 499, billingCycle: 'monthly', categoryId: 4, domain: 'canva.com' },
  { name: 'Duolingo Plus', cost: 399, billingCycle: 'monthly', categoryId: 7, domain: 'duolingo.com' },
  { name: 'Zee5', cost: 99, billingCycle: 'monthly', categoryId: 1, domain: 'zee5.com' },
];

// Helper to get logo URL
const getLogoUrl = (domain) => {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

const emptyForm = {
  name: '',
  cost: '',
  billingCycle: 'monthly',
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
        background: '#f9fafb', padding: '2px',
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%' }}
      />
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
          <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>
            {subscriptions.length} total subscriptions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}
          style={{ background: '#6366f1', color: '#fff', padding: '10px 20px' }}
        >
          + Add Subscription
        </motion.button>
      </motion.div>

      {/* NLP Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
            🤖 Add with AI — just type naturally
          </p>
          <input
            placeholder='e.g. "Add Netflix 499 monthly" or "Spotify 119 per month"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNLParse()}
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
          onClick={handleNLParse}
          disabled={nlLoading}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            padding: '10px 20px',
            border: '1px solid rgba(255,255,255,0.3)',
            marginTop: '24px',
          }}
        >
          {nlLoading ? '⏳' : '✨ Parse'}
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
            style={{ textAlign: 'center', padding: '60px', color: '#999' }}
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
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
  <SubscriptionLogo domain={sub.domain} name={sub.name} />
  <div>
    <p style={{ fontWeight: 600, fontSize: '16px' }}>{sub.name}</p>
    <p style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
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
                    <span style={{ fontSize: '14px', color: '#999', fontWeight: 400 }}>
                      /{sub.billingCycle}
                    </span>
                  </p>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    🔄 Renews: {new Date(sub.nextRenewalDate).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEdit(sub)}
                    style={{ flex: 1, background: '#f3f4f6', color: '#333', padding: '8px' }}
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
                background: '#fff',
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
    <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px', fontWeight: 500 }}>
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
            background: form.name === sub.name ? '#ede9fe' : '#f9fafb',
            border: form.name === sub.name ? '2px solid #6366f1' : '1px solid #e5e7eb',
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
          <span style={{ fontSize: '10px', color: '#555', textAlign: 'center', lineHeight: 1.2 }}>
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
  style={{ width: 24, height: 24, borderRadius: '4px', background: '#f9fafb', padding: '2px' }}
  onError={e => e.target.style.display = 'none'}
/>
      <span style={{ fontSize: '12px', color: '#666' }}>Logo preview</span>
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
                    style={{ flex: 1, background: '#f3f4f6', color: '#333', padding: '12px' }}
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