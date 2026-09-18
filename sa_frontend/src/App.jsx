import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SaAuthProvider, useSaAuth } from './context/SaAuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SaLogin } from './pages/SaLogin';
import { SaDashboard } from './pages/SaDashboard';
import { Packages } from './pages/Packages';
import { ProvisionHotelPage } from './pages/ProvisionHotelPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useSaAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppContent() {
  const { user } = useSaAuth();

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div className={`sa-app-body${user ? ' authenticated' : ''}`}>
          {user && <Sidebar />}
          <main className="sa-main-content">
            <Routes>
            <Route path="/login" element={<SaLogin />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SaDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages"
              element={
                <ProtectedRoute>
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provision-hotel"
              element={
                <ProtectedRoute>
                  <ProvisionHotelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-hotel/:tenantId"
              element={
                <ProtectedRoute>
                  <ProvisionHotelPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <SaAuthProvider>
      <AppContent />
    </SaAuthProvider>
  );
}
