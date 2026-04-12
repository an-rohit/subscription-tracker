import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.1 } },
};

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [summaryRes, categoryRes, yearlyRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/by-category'),
        api.get('/analytics/yearly'),
      ]);
      setSummary(summaryRes.data);
      setByCategory(categoryRes.data.byCategory);
      setYearly(yearlyRes.data.yearlyBreakdown);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e5e7eb',
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
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>📊 Analytics</h1>
        <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>
          Understand your subscription spending
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
        {[
          { label: 'Monthly Spend', value: `₹${summary?.estimatedMonthlySpend || 0}`, color: '#6366f1', emoji: '💳' },
          { label: 'Yearly Spend', value: `₹${summary?.estimatedYearlySpend || 0}`, color: '#10b981', emoji: '📅' },
          { label: 'Active Subs', value: summary?.totalActiveSubscriptions || 0, color: '#f59e0b', emoji: '✅' },
          { label: 'Categories', value: byCategory.length, color: '#8b5cf6', emoji: '🏷️' },
        ].map((card, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            style={{ ...cardStyle, borderLeft: `4px solid ${card.color}` }}
          >
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {card.emoji} {card.label}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}
      >
        {/* Pie Chart */}
        <motion.div variants={fadeUp} style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            🥧 Spending by Category
          </h2>
          {byCategory.length === 0 ? (
            <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="totalMonthly"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ category, percent }) =>
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {byCategory.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value}`, 'Monthly']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Bar Chart */}
        <motion.div variants={fadeUp} style={cardStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            📊 Category Breakdown
          </h2>
          {byCategory.length === 0 ? (
            <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`₹${value}`, 'Monthly Spend']} />
                <Bar dataKey="totalMonthly" radius={[6, 6, 0, 0]}>
                  {byCategory.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </motion.div>

      {/* Yearly Line Chart */}
      <motion.div variants={fadeUp} style={{ ...cardStyle, marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          📈 Monthly Spending Trend (This Year)
        </h2>
        {yearly.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            No data yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`₹${value}`, 'Spend']} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Category Table */}
      <motion.div variants={fadeUp} style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          🏷️ Category Details
        </h2>
        {byCategory.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px' }}>No subscriptions yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px', color: '#666' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px', color: '#666' }}>Subscriptions</th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '13px', color: '#666' }}>Monthly Cost</th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '13px', color: '#666' }}>Yearly Cost</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((cat, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: 500 }}>
                    {cat.icon} {cat.category}
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '14px', color: '#666' }}>
                    {cat.subscriptions.join(', ')}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: '#6366f1' }}>
                    ₹{cat.totalMonthly}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                    ₹{(cat.totalMonthly * 12).toFixed(2)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <td style={{ padding: '12px 10px', fontWeight: 700 }}>Total</td>
                <td></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>
                  ₹{summary?.estimatedMonthlySpend || 0}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                  ₹{summary?.estimatedYearlySpend || 0}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}