import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 17H9m9-2v-4a6 6 0 0 0-12 0v4l-2 2h16l-2-2Zm-4 4a2 2 0 0 1-4 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const getReminderKey = (reminder) => `${reminder.id}-${reminder.nextRenewalDate}`;

const getDaysLeft = (date) => {
  if (!date) return null;
  const today = new Date();
  const renewal = new Date(date);
  today.setHours(0, 0, 0, 0);
  renewal.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((renewal - today) / (1000 * 60 * 60 * 24)));
};

const formatReminderText = (reminder) => {
  const daysLeft = getDaysLeft(reminder.nextRenewalDate);
  if (daysLeft === 0) return `${reminder.name} renews today`;
  if (daysLeft === 1) return `${reminder.name} renews tomorrow`;
  return `${reminder.name} renews in ${daysLeft} days`;
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [readReminderKeys, setReadReminderKeys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('readRenewalReminders') || '[]');
    } catch {
      return [];
    }
  });
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await api.get('/analytics/upcoming-renewals');
        setReminders(res.data.upcomingRenewals || []);
      } catch {
        setReminders([]);
      }
    };

    fetchReminders();
  }, []);

  const unreadReminders = useMemo(
    () => reminders.filter(reminder => !readReminderKeys.includes(getReminderKey(reminder))),
    [reminders, readReminderKeys]
  );

  const markReminderRead = (reminder) => {
    const key = getReminderKey(reminder);
    setReadReminderKeys(current => {
      if (current.includes(key)) return current;
      const next = [...current, key];
      localStorage.setItem('readRenewalReminders', JSON.stringify(next));
      return next;
    });
  };

  const markAllRead = () => {
    const allKeys = reminders.map(getReminderKey);
    setReadReminderKeys(allKeys);
    localStorage.setItem('readRenewalReminders', JSON.stringify(allKeys));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'background 0.2s ease, border-color 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span style={{ fontWeight: 800, fontSize: '18px', lineHeight: 1.2, color: '#6366f1' }}>
          SubTracker
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Dashboard</Link>
          <Link to="/subscriptions" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Subscriptions</Link>
          <Link to="/timeline" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Timeline</Link>
          <Link to="/analytics" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Analytics</Link>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowReminders(current => !current)}
            aria-label="Open renewal reminders"
            title="Renewal reminders"
            style={{
              width: '38px',
              height: '34px',
              background: showReminders ? 'var(--primary-soft)' : 'var(--surface-muted)',
              color: showReminders ? 'var(--primary)' : 'var(--text)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <BellIcon />
            {unreadReminders.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '999px',
                background: '#ef4444',
                color: '#fff',
                border: '2px solid var(--surface)',
                fontSize: '10px',
                fontWeight: 800,
                lineHeight: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {unreadReminders.length}
              </span>
            )}
          </button>

          {showReminders && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '44px',
              width: 'min(360px, calc(100vw - 32px))',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow)',
              padding: '14px',
              zIndex: 200,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>Renewal reminders</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                    Next 7 days
                  </p>
                </div>
                {reminders.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      background: 'transparent',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 0',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {reminders.length === 0 ? (
                <div style={{
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}>
                  No renewals due soon.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {reminders.map(reminder => {
                    const isRead = readReminderKeys.includes(getReminderKey(reminder));
                    return (
                      <button
                        key={getReminderKey(reminder)}
                        type="button"
                        onClick={() => markReminderRead(reminder)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: isRead ? 'var(--surface-soft)' : 'var(--primary-soft)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'grid',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>
                          {formatReminderText(reminder)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Rs {reminder.cost} / {reminder.billingCycle} - {new Date(reminder.nextRenewalDate).toLocaleDateString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.2, color: 'var(--text-muted)' }}>Hi, {user?.name}</span>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            width: '38px',
            height: '34px',
            background: 'var(--surface-muted)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          {isDark ? '☀' : '☾'}
        </button>
        <button onClick={handleLogout} style={{
          background: 'var(--surface-muted)',
          color: 'var(--text-muted)',
          padding: '8px 16px',
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
