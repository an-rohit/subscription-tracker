import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.user, res.data.token);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #e5e7eb',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Create account</h1>
        <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>Start tracking your subscriptions</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%',
            padding: '12px',
            background: '#6366f1',
            color: '#fff',
            fontSize: '15px',
          }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}