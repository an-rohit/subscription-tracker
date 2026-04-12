import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, upcomingRes, subsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/upcoming-renewals'),
        api.get('/subscriptions'),
      ]);
      setSummary(summaryRes.data);
      setUpcoming(upcomingRes.data.upcomingRenewals);
      setSubscriptions(subsRes.data.subscriptions);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getAIInsight = async () => {
    setLoadingAI(true);
    try {
      const res = await api.post('/ai/analyze');
      setAiInsight(res.data.insight);
    } catch (err) {
      toast.error('AI analysis failed. Try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
  };

  const summaryCards = [
    { label: 'Monthly Spend', value: `₹${summary?.estimatedMonthlySpend || 0}`, color: '#6366f1', emoji: '💳' },
    { label: 'Yearly Spend', value: `₹${summary?.estimatedYearlySpend || 0}`, color: '#10b981', emoji: '📅' },
    { label: 'Active Subscriptions', value: summary?.totalActiveSubscriptions || 0, color: '#f59e0b', emoji: '✅' },
    { label: 'Renewals This Week', value: upcoming?.length || 0, color: '#ef4444', emoji: '🔔' },
  ];

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
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>
          👋 Welcome back, {user?.name}!
        </h1>
        <p style={{ color: '#666', marginTop: '4px' }}>
          Here's your subscription overview
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        variants={stagger}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {summaryCards.map((card, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            style={{ ...cardStyle, borderLeft: `4px solid ${card.color}`, cursor: 'default' }}
          >
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {card.emoji} {card.label}
            </p>
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.3 }}
              style={{ fontSize: '28px', fontWeight: 700, color: card.color }}
            >
              {card.value}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>

      {/* Two column grid */}
      <motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}
      >
        {/* Upcoming Renewals */}
        <motion.div variants={fadeUp} style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            🔔 Upcoming Renewals
          </h2>
          {upcoming.length === 0 ? (
            <p style={{ color: '#999', fontSize: '14px' }}>No renewals in the next 7 days</p>
          ) : (
            upcoming.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>{sub.name}</p>
                  <p style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(sub.nextRenewalDate).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  background: '#fef3c7',
                  color: '#d97706',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ₹{sub.cost}
                </span>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Recent Subscriptions */}
        <motion.div variants={fadeUp} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>📋 Recent Subscriptions</h2>
            <Link to="/subscriptions" style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {subscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '12px' }}>No subscriptions yet</p>
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
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>{sub.name}</p>
                  <p style={{ fontSize: '12px', color: '#999' }}>{sub.billingCycle}</p>
                </div>
                <span style={{
                  background: sub.status === 'active' ? '#d1fae5' : '#f3f4f6',
                  color: sub.status === 'active' ? '#065f46' : '#666',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  ₹{sub.cost}
                </span>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

      {/* AI Insight */}
      <motion.div
        variants={fadeUp}
        whileHover={{ scale: 1.01 }}
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
              🤖 AI Spending Insights
            </h2>
            {aiInsight ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: '1.6' }}
              >
                {aiInsight}
              </motion.p>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                Click analyze to get personalized AI insights about your spending
              </p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={getAIInsight}
            disabled={loadingAI}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '10px 20px',
              marginLeft: '16px',
              border: '1px solid rgba(255,255,255,0.3)',
              flexShrink: 0,
            }}
          >
            {loadingAI ? '⏳ Analyzing...' : '✨ Analyze'}
          </motion.button>
        </div>
      </motion.div>

    </motion.div>
  );
}