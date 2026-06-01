import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import RenewalTimeline from './pages/RenewalTimeline';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { token } = useAuth();
  const location = useLocation();
  return (
    <>
      {token && <Navbar />}
      <AnimatePresence mode="wait">
        <Motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
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
            <Route path="/timeline" element={
              <ProtectedRoute><RenewalTimeline /></ProtectedRoute>
            } />
          </Routes>
        </Motion.div>
      </AnimatePresence>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--surface-raised)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 650,
              },
              success: {
                iconTheme: {
                  primary: 'var(--success)',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--danger)',
                  secondary: '#fff',
                },
              },
            }}
          />
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}


// import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { Toaster } from 'react-hot-toast';
// import { AuthProvider, useAuth } from './context/AuthContext';
// import Navbar from './components/Navbar';
// import Login from './pages/Login';
// import Register from './pages/Register';
// import Dashboard from './pages/Dashboard';
// import Subscriptions from './pages/Subscriptions';
// import Analytics from './pages/Analytics';

// const ProtectedRoute = ({ children }) => {
//   const { token } = useAuth();
//   return token ? children : <Navigate to="/login" />;
// };

// const AppContent = () => {
//   const location = useLocation();
//   const { token } = useAuth();
  
//   // Hide navbar on login and register pages
//   const hideNavbar = location.pathname === '/login' || location.pathname === '/register';

//   return (
//     <>
//       {!hideNavbar && token && <Navbar />}
//       <Routes>
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
//         <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
//         <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
//       </Routes>
//     </>
//   );
// };

// function App() {
//   return (
//     <BrowserRouter>
//       <AuthProvider>
//         <AppContent />
//         <Toaster position="top-right" />
//       </AuthProvider>
//     </BrowserRouter>
//   );
// }

// export default App;
