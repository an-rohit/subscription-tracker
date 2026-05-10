import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

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
          <Link to="/analytics" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>Analytics</Link>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
