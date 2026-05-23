import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
        <Route path="/timeline" element={
          <ProtectedRoute><RenewalTimeline /></ProtectedRoute>
        } />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
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
