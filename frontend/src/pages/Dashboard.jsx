import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Monthly Spend');
  const [spendView, setSpendView] = useState('monthly');
  const [expandedRenewalId, setExpandedRenewalId] = useState(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [summaryRes, upcomingRes, subsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/upcoming-renewals'),
        api.get('/subscriptions'),
      ]);
      setSummary(summaryRes.data);
      setUpcoming(upcomingRes.data.upcomingRenewals);
      setSubscriptions(subsRes.data.subscriptions);
      setSelectedSubscriptionId(current => current || subsRes.data.subscriptions?.[0]?.id || null);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cardStyle = {
    background: 'var(--surface)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
  };

  const sectionTitleStyle = {
    fontSize: '17px',
    fontWeight: 700,
    lineHeight: 1.25,
  };

  const mutedTextStyle = {
    color: 'var(--text-muted)',
    fontSize: '14px',
    lineHeight: 1.5,
  };

  const summaryCards = [
    { label: 'Monthly Spend', value: `Rs ${summary?.estimatedMonthlySpend || 0}`, color: '#6366f1' },
    { label: 'Yearly Spend', value: `Rs ${summary?.estimatedYearlySpend || 0}`, color: '#10b981' },
    { label: 'Active Subscriptions', value: summary?.totalActiveSubscriptions || 0, color: '#f59e0b' },
    { label: 'Renewals This Week', value: upcoming?.length || 0, color: '#ef4444' },
  ];

  const selectedSubscription = subscriptions.find(sub => sub.id === selectedSubscriptionId) || subscriptions[0];
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const pausedSubscriptions = subscriptions.filter(sub => sub.status === 'paused');
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled');
  const spendAmount = spendView === 'monthly'
    ? summary?.estimatedMonthlySpend || 0
    : summary?.estimatedYearlySpend || 0;

  const getDaysLeft = (date) => {
    if (!date) return null;
    const today = new Date();
    const renewal = new Date(date);
    today.setHours(0, 0, 0, 0);
    renewal.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((renewal - today) / (1000 * 60 * 60 * 24)));
  };

  const selectedMetricHint = {
    'Monthly Spend': 'Your estimated recurring spend this month.',
    'Yearly Spend': 'Your projected annual subscription total.',
    'Active Subscriptions': `${activeSubscriptions.length} active, ${pausedSubscriptions.length} paused, ${cancelledSubscriptions.length} cancelled.`,
    'Renewals This Week': 'Subscriptions renewing in the next 7 days.',
  }[selectedMetric];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <Motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: '#6366f1', borderRadius: '50%' }}
      />
    </div>
  );

  return (
    <Motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}
    >
      <Motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.15 }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ ...mutedTextStyle, marginTop: '6px', fontSize: '15px' }}>
            Here's your subscription overview
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={refreshing}
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '10px 14px',
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link to="/subscriptions" style={{
            background: '#6366f1',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 650,
            lineHeight: 1.2,
          }}>
            Add Subscription
          </Link>
        </div>
      </Motion.div>

      <Motion.div
        variants={stagger}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {summaryCards.map((card, i) => (
          <Motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMetric(card.label)}
            style={{
              ...cardStyle,
              borderLeft: `4px solid ${card.color}`,
              outline: selectedMetric === card.label ? `2px solid ${card.color}` : 'none',
              cursor: 'pointer',
            }}
          >
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 650, lineHeight: 1.35, marginBottom: '10px' }}>
              {card.label}
            </p>
            <Motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1.1, color: card.color, fontVariantNumeric: 'tabular-nums' }}
            >
              {card.value}
            </Motion.p>
          </Motion.div>
        ))}
      </Motion.div>

      <Motion.div variants={fadeUp} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={sectionTitleStyle}>Spend Snapshot</h2>
              <p style={{ ...mutedTextStyle, marginTop: '4px' }}>{selectedMetricHint}</p>
            </div>
            <div style={{ display: 'flex', background: 'var(--surface-muted)', borderRadius: '10px', padding: '3px' }}>
              {['monthly', 'yearly'].map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setSpendView(view)}
                  style={{
                    background: spendView === view ? '#6366f1' : 'transparent',
                    color: spendView === view ? '#fff' : 'var(--text-muted)',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    textTransform: 'capitalize',
                  }}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '34px', fontWeight: 850, color: '#6366f1', fontVariantNumeric: 'tabular-nums' }}>
            Rs {spendAmount}
          </div>
          <div style={{ height: '10px', background: 'var(--surface-muted)', borderRadius: '999px', overflow: 'hidden', marginTop: '18px' }}>
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Number(summary?.totalActiveSubscriptions || 0) * 12)}%` }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)' }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            ['Active', activeSubscriptions.length, '#10b981'],
            ['Paused', pausedSubscriptions.length, '#f59e0b'],
            ['Cancelled', cancelledSubscriptions.length, '#ef4444'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>{label}</p>
              <p style={{ color, fontSize: '26px', fontWeight: 850, marginTop: '6px' }}>{value}</p>
            </div>
          ))}
        </div>
      </Motion.div>

      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}
      >
        <Motion.div variants={fadeUp} style={cardStyle}>
          <h2 style={{ ...sectionTitleStyle, marginBottom: '16px' }}>
            Upcoming Renewals
          </h2>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)', fontSize: '14px', lineHeight: 1.5 }}>No renewals in the next 7 days</p>
          ) : (
            upcoming.map((sub, i) => (
              <Motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedRenewalId(expandedRenewalId === sub.id ? null : sub.id)}
                  onKeyDown={e => e.key === 'Enter' && setExpandedRenewalId(expandedRenewalId === sub.id ? null : sub.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div>
                    <p style={{ fontWeight: 650, fontSize: '14px', lineHeight: 1.35 }}>{sub.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.4, marginTop: '2px' }}>
                      {new Date(sub.nextRenewalDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{
                    background: '#fef3c7',
                    color: '#d97706',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    Rs {sub.cost}
                  </span>
                </div>
                {expandedRenewalId === sub.id && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ marginTop: '10px', padding: '10px', background: 'var(--surface-soft)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)' }}
                  >
                    {getDaysLeft(sub.nextRenewalDate)} days left • {sub.billingCycle} billing • {sub.category?.name || 'Uncategorized'}
                  </Motion.div>
                )}
              </Motion.div>
            ))
          )}
        </Motion.div>

        <Motion.div variants={fadeUp} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Recent Subscriptions</h2>
            <Link to="/subscriptions" style={{ fontSize: '13px', fontWeight: 650, color: '#6366f1', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {subscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: 'var(--text-subtle)', fontSize: '14px', lineHeight: 1.5, marginBottom: '12px' }}>No subscriptions yet</p>
              <Link to="/subscriptions" style={{
                background: '#6366f1',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
              }}>
                Add your first subscription
              </Link>
            </div>
          ) : (
            subscriptions.slice(0, 5).map((sub, i) => (
              <Motion.div
                key={sub.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedSubscriptionId(sub.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-soft)',
                  cursor: 'pointer',
                  background: selectedSubscriptionId === sub.id ? 'var(--surface-soft)' : 'transparent',
                  borderRadius: selectedSubscriptionId === sub.id ? '10px' : 0,
                  paddingInline: selectedSubscriptionId === sub.id ? '10px' : 0,
                }}
              >
                <div>
                  <p style={{ fontWeight: 650, fontSize: '14px', lineHeight: 1.35 }}>{sub.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.4, marginTop: '2px' }}>{sub.billingCycle}</p>
                </div>
                <span style={{
                  background: sub.status === 'active' ? '#d1fae5' : 'var(--surface-muted)',
                  color: sub.status === 'active' ? '#065f46' : 'var(--text-muted)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  Rs {sub.cost}
                </span>
              </Motion.div>
            ))
          )}
        </Motion.div>
      </Motion.div>

      {selectedSubscription && (
        <Motion.div variants={fadeUp} style={{ ...cardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
            <div>
              <h2 style={sectionTitleStyle}>Selected Subscription</h2>
              <p style={{ ...mutedTextStyle, marginTop: '6px' }}>
                Click any recent subscription to inspect it here.
              </p>
            </div>
            <Link to="/subscriptions" style={{ color: '#6366f1', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
              Manage
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              ['Service', selectedSubscription.name],
              ['Cost', `Rs ${selectedSubscription.cost}`],
              ['Cycle', selectedSubscription.billingCycle],
              ['Next Renewal', selectedSubscription.nextRenewalDate ? new Date(selectedSubscription.nextRenewalDate).toLocaleDateString() : 'Not set'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
                <p style={{ color: 'var(--text-subtle)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '14px', fontWeight: 750, lineHeight: 1.35 }}>{value}</p>
              </div>
            ))}
          </div>
        </Motion.div>
      )}

    </Motion.div>
  );
}
