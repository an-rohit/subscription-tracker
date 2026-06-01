import { useState, useEffect, useMemo } from 'react';
import { motion as Motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   Constants & Variants
───────────────────────────────────────────── */
const COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#38bdf8','#a855f7','#ec4899'];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.09 } } };

const formatCurrency = (value) => `Rs ${Number(value || 0).toFixed(0)}`;

/* ─────────────────────────────────────────────
   Custom Chart Tooltip
───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: 'var(--surface-raised)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
      color: 'var(--text)',
    }}>
      <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{label || item.name}</p>
      <p style={{ fontSize: 14, color: item.color || 'var(--primary)', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {formatCurrency(item.value)}
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────── */
const KpiCard = ({ label, value, color, icon }) => (
  <Motion.div
    variants={fadeUp}
    whileHover={{ y: -4, boxShadow: `0 14px 40px color-mix(in srgb, ${color} 18%, transparent)` }}
    style={{
      background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
      border: '1px solid var(--border)', borderRadius: 20, padding: 22,
      boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
      position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.25s',
    }}
  >
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '20px 20px 0 0' }} />
    <div style={{
      width: 38, height: 38, borderRadius: 12, marginBottom: 14,
      background: `color-mix(in srgb, ${color} 14%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>
      {icon}
    </div>
    <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</p>
    <p style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 28, fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
    }}>
      {value}
    </p>
  </Motion.div>
);

/* ─────────────────────────────────────────────
   Icons
───────────────────────────────────────────── */
const MoneyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7"/>
    <path d="M12 6v12M9 9.5c0-1.1.9-2 2-2h2.5a2 2 0 0 1 0 4H10a2 2 0 0 0 0 4H12.5a2 2 0 0 0 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M7 14l4-5 4 3 4-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LayersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const GridIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7"/>
  </svg>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function Analytics() {
  const [summary, setSummary]             = useState(null);
  const [byCategory, setByCategory]       = useState([]);
  const [yearly, setYearly]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => { fetchAnalytics(); }, []);

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
    } catch { toast.error('Failed to load analytics'); }
    finally  { setLoading(false); }
  };

  const totalMonthly = useMemo(
    () => byCategory.reduce((sum, item) => sum + Number(item.totalMonthly || 0), 0),
    [byCategory]
  );

  const highlightedCategory = activeCategory
    ? byCategory.find(item => item.category === activeCategory)
    : byCategory[0];

  const axisTick = { fontSize: 12, fill: 'var(--text-subtle)', fontWeight: 600 };

  /* ── Skeleton loading ── */
  if (loading) return (
    <div className="app-shell">
      {/* Header skeleton */}
      <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 24, padding: '28px 32px', marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 4, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: 220, height: 32, borderRadius: 8, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: 340, height: 16, borderRadius: 4 }} />
      </div>

      {/* KPI skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}>
            <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 12, marginBottom: 14 }} />
            <div className="skeleton" style={{ width: '50%', height: 14, borderRadius: 4, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '80%', height: 28, borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 4, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 260, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Motion.div initial="hidden" animate="show" variants={stagger} className="app-shell">

      {/* ══ Page Header ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          marginBottom: 24, padding: '28px 32px',
          borderRadius: 24,
          background: 'var(--gradient-panel), var(--surface-raised)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-glow), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Insights
          </p>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>
            Understand your subscription spending patterns and category breakdown.
          </p>
        </div>
      </Motion.div>

      {/* ══ KPI Cards ══ */}
      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        <KpiCard label="Monthly Spend"  value={formatCurrency(summary?.estimatedMonthlySpend)} color={COLORS[0]} icon={<MoneyIcon />} />
        <KpiCard label="Yearly Spend"   value={formatCurrency(summary?.estimatedYearlySpend)}  color={COLORS[1]} icon={<TrendIcon />} />
        <KpiCard label="Active Subs"    value={summary?.totalActiveSubscriptions || 0}          color={COLORS[2]} icon={<LayersIcon />} />
        <KpiCard label="Categories"     value={byCategory.length}                               color={COLORS[5]} icon={<GridIcon />} />
      </Motion.div>

      {/* ══ Pie + Bar Charts ══ */}
      <Motion.div
        variants={stagger}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}
      >
        {/* Pie chart card */}
        <Motion.div
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: 20, padding: 24,
            boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>Spending by Category</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Click a slice to highlight</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-subtle)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total monthly</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--primary)', fontSize: 18, fontWeight: 800 }}>{formatCurrency(totalMonthly)}</p>
            </div>
          </div>

          {byCategory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No data yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Add subscriptions to see analytics</p>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory} dataKey="totalMonthly" nameKey="category"
                      cx="50%" cy="50%" innerRadius={70} outerRadius={108}
                      paddingAngle={4} cornerRadius={10}
                      isAnimationActive animationBegin={120} animationDuration={950}
                      onMouseEnter={entry => setActiveCategory(entry.category)}
                      onClick={entry => setActiveCategory(entry.category)}
                    >
                      {byCategory.map((entry, index) => (
                        <Cell key={entry.category} fill={COLORS[index % COLORS.length]}
                          stroke="var(--surface)" strokeWidth={3}
                          opacity={!activeCategory || activeCategory === entry.category ? 1 : 0.3}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut center label */}
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                  <Motion.div
                    key={highlightedCategory?.category}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ textAlign: 'center' }}
                  >
                    <p style={{ color: 'var(--text-subtle)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {highlightedCategory?.category || 'Total'}
                    </p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text)', fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(highlightedCategory?.totalMonthly || totalMonthly)}
                    </p>
                  </Motion.div>
                </div>
              </div>

              {/* Category legend chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {byCategory.map((cat, index) => (
                  <Motion.button
                    key={cat.category}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => setActiveCategory(cat.category === activeCategory ? null : cat.category)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999,
                      background: activeCategory === cat.category ? `color-mix(in srgb, ${COLORS[index % COLORS.length]} 16%, var(--surface-soft))` : 'var(--surface-soft)',
                      border: activeCategory === cat.category ? `1.5px solid ${COLORS[index % COLORS.length]}` : '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13, fontWeight: 700,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[index % COLORS.length], flexShrink: 0 }} />
                    {cat.category}
                  </Motion.button>
                ))}
              </div>
            </>
          )}
        </Motion.div>

        {/* Bar chart card */}
        <Motion.div
          variants={fadeUp}
          style={{
            background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
            border: '1px solid var(--border)', borderRadius: 20, padding: 24,
            boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)',
          }}
        >
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Category Breakdown</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Monthly cost by category</p>
          {byCategory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="category" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalMonthly" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={900}>
                  {byCategory.map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]}
                      opacity={!activeCategory || activeCategory === entry.category ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Motion.div>
      </Motion.div>

      {/* ══ Spending Trend Line Chart ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
          border: '1px solid var(--border)', borderRadius: 20, padding: 24,
          boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)', marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800 }}>Monthly Spending Trend</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Your subscription spend over the year</p>
          </div>
          <div style={{ padding: '6px 14px', background: 'var(--primary-soft)', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
            This year
          </div>
        </div>
        {yearly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-subtle)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📈</div>
            <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No trend data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={yearly}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="amount"
                stroke="var(--primary)" strokeWidth={2.5}
                fill="url(#trendGrad)"
                dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                activeDot={{ r: 7, stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Motion.div>

      {/* ══ Category Details Table ══ */}
      <Motion.div
        variants={fadeUp}
        style={{
          background: 'color-mix(in srgb, var(--surface-raised) 94%, transparent)',
          border: '1px solid var(--border)', borderRadius: 20, padding: 24,
          boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)', overflow: 'hidden',
        }}
      >
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 800, marginBottom: 18 }}>Category Details</h2>
        {byCategory.length === 0 ? (
          <p style={{ color: 'var(--text-subtle)', fontSize: 14 }}>No subscriptions yet</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                  {['Category','Subscriptions','Monthly Cost','Yearly Cost'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Category' || h === 'Subscriptions' ? 'left' : 'right', padding: '10px 12px', fontSize: 11, fontWeight: 800, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byCategory.map((cat, i) => (
                  <Motion.tr
                    key={cat.category}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    onMouseEnter={() => setActiveCategory(cat.category)}
                    onMouseLeave={() => setActiveCategory(null)}
                    style={{
                      borderBottom: '1px solid var(--border-soft)',
                      background: activeCategory === cat.category ? 'var(--surface-soft)' : 'transparent',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '13px 12px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        {cat.category}
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px', fontSize: 13, color: 'var(--text-muted)', maxWidth: 240 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {cat.subscriptions.map(s => (
                          <span key={s} style={{ background: 'var(--surface-muted)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '13px 12px', textAlign: 'right', fontWeight: 800, color: COLORS[i % COLORS.length], fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatCurrency(cat.totalMonthly)}
                    </td>
                    <td style={{ padding: '13px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {formatCurrency(cat.totalMonthly * 12)}
                    </td>
                  </Motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1.5px solid var(--border)', background: 'var(--surface-soft)' }}>
                  <td style={{ padding: '13px 12px', fontWeight: 800, fontSize: 14 }}>Total</td>
                  <td />
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {formatCurrency(summary?.estimatedMonthlySpend)}
                  </td>
                  <td style={{ padding: '13px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-muted)', fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {formatCurrency(summary?.estimatedYearlySpend)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Motion.div>

    </Motion.div>
  );
}
