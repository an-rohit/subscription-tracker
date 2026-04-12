import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { token } = useAuth();
  return (
    <>
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/subscriptions" element={
          <ProtectedRoute><Subscriptions /></ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute><Analytics /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}