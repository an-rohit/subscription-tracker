import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span style={{ fontWeight: 700, fontSize: '18px', color: '#6366f1' }}>
          SubTracker
        </span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#555', fontSize: '14px' }}>Dashboard</Link>
          <Link to="/subscriptions" style={{ textDecoration: 'none', color: '#555', fontSize: '14px' }}>Subscriptions</Link>
          <Link to="/analytics" style={{ textDecoration: 'none', color: '#555', fontSize: '14px' }}>Analytics</Link>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '14px', color: '#555' }}>Hi, {user?.name}</span>
        <button onClick={handleLogout} style={{
          background: '#f3f4f6',
          color: '#555',
          padding: '8px 16px',
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}