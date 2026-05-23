import { useState, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip,
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

const formatCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '10px 12px',
      boxShadow: 'var(--shadow)',
      color: 'var(--text)',
    }}>
      <p style={{ fontSize: '13px', fontWeight: 800, marginBottom: '4px' }}>
        {label || item.name}
      </p>
      <p style={{ fontSize: '13px', color: item.color || '#6366f1', fontWeight: 750 }}>
        {formatCurrency(item.value)}
      </p>
    </div>
  );
};

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [yearly, setYearly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

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
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    background: 'var(--surface)',
    borderRadius: '14px',
    padding: '24px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
  };

  const totalMonthly = useMemo(
    () => byCategory.reduce((sum, item) => sum + Number(item.totalMonthly || 0), 0),
    [byCategory]
  );

  const highlightedCategory = activeCategory
    ? byCategory.find(item => item.category === activeCategory)
    : byCategory[0];

  const axisTick = { fontSize: 12, fill: 'var(--text-subtle)', fontWeight: 600 };

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
      <Motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 850, lineHeight: 1.15 }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '15px', lineHeight: 1.5 }}>
          Understand your subscription spending
        </p>
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
        {[
          { label: 'Monthly Spend', value: formatCurrency(summary?.estimatedMonthlySpend), color: '#6366f1' },
          { label: 'Yearly Spend', value: formatCurrency(summary?.estimatedYearlySpend), color: '#10b981' },
          { label: 'Active Subs', value: summary?.totalActiveSubscriptions || 0, color: '#f59e0b' },
          { label: 'Categories', value: byCategory.length, color: '#8b5cf6' },
        ].map((card) => (
          <Motion.div
            key={card.label}
            variants={fadeUp}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            style={{ ...cardStyle, borderLeft: `4px solid ${card.color}` }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '10px' }}>
              {card.label}
            </p>
            <p style={{ fontSize: '28px', lineHeight: 1.1, fontWeight: 850, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
              {card.value}
            </p>
          </Motion.div>
        ))}
      </Motion.div>

      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}
      >
        <Motion.div variants={fadeUp} style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.25 }}>Spending by Category</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Animated hollow pie chart
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-subtle)', fontSize: '12px', fontWeight: 700 }}>Total monthly</p>
              <p style={{ color: '#6366f1', fontSize: '18px', fontWeight: 850 }}>{formatCurrency(totalMonthly)}</p>
            </div>
          </div>

          {byCategory.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              No data yet
            </p>
          ) : (
            <>
              <div style={{ position: 'relative', height: 290 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="totalMonthly"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={4}
                      cornerRadius={10}
                      isAnimationActive
                      animationBegin={120}
                      animationDuration={950}
                      onMouseEnter={(entry) => setActiveCategory(entry.category)}
                      onClick={(entry) => setActiveCategory(entry.category)}
                    >
                      {byCategory.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={COLORS[index % COLORS.length]}
                          stroke="var(--surface)"
                          strokeWidth={3}
                          opacity={!activeCategory || activeCategory === entry.category ? 1 : 0.35}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <Motion.div
                    key={highlightedCategory?.category}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center' }}
                  >
                    <p style={{ color: 'var(--text-subtle)', fontSize: '12px', fontWeight: 700 }}>
                      {highlightedCategory?.category || 'Total'}
                    </p>
                    <p style={{ color: 'var(--text)', fontSize: '24px', fontWeight: 850, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(highlightedCategory?.totalMonthly || totalMonthly)}
                    </p>
                  </Motion.div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {byCategory.map((cat, index) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => setActiveCategory(cat.category)}
                    style={{
                      textAlign: 'left',
                      background: activeCategory === cat.category ? 'var(--primary-soft)' : 'var(--surface-soft)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      padding: '10px',
                    }}
                  >
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: COLORS[index % COLORS.length], marginRight: 8 }} />
                    <span style={{ fontSize: '13px', fontWeight: 750 }}>{cat.category}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Motion.div>

        <Motion.div variants={fadeUp} style={cardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
            Category Breakdown
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Monthly cost comparison
          </p>
          {byCategory.length === 0 ? (
            <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
              No data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byCategory} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="category" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="totalMonthly"
                  radius={[10, 10, 0, 0]}
                  isAnimationActive
                  animationDuration={900}
                >
                  {byCategory.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={COLORS[index % COLORS.length]}
                      opacity={!activeCategory || activeCategory === entry.category ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Motion.div>
      </Motion.div>

      <Motion.div variants={fadeUp} style={{ ...cardStyle, marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
          Monthly Spending Trend
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          This year
        </p>
        {yearly.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
            No data yet
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 5 }}
                activeDot={{ r: 8 }}
                isAnimationActive
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Motion.div>

      <Motion.div variants={fadeUp} style={cardStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>
          Category Details
        </h2>
        {byCategory.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>No subscriptions yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>Subscriptions</th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>Monthly Cost</th>
                <th style={{ textAlign: 'right', padding: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>Yearly Cost</th>
              </tr>
            </thead>
            <tbody>
              {byCategory.map((cat, i) => (
                <Motion.tr
                  key={cat.category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onMouseEnter={() => setActiveCategory(cat.category)}
                  style={{
                    borderBottom: '1px solid var(--border-soft)',
                    background: activeCategory === cat.category ? 'var(--surface-soft)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: 650 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], marginRight: 8 }} />
                    {cat.category}
                  </td>
                  <td style={{ padding: '12px 10px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {cat.subscriptions.join(', ')}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 750, color: '#6366f1' }}>
                    {formatCurrency(cat.totalMonthly)}
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 750, color: '#10b981' }}>
                    {formatCurrency(cat.totalMonthly * 12)}
                  </td>
                </Motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-soft)' }}>
                <td style={{ padding: '12px 10px', fontWeight: 800 }}>Total</td>
                <td></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#6366f1' }}>
                  {formatCurrency(summary?.estimatedMonthlySpend)}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                  {formatCurrency(summary?.estimatedYearlySpend)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </Motion.div>
    </Motion.div>
  );
}
