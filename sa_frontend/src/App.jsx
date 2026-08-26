import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SaAuthProvider, useSaAuth } from './context/SaAuthContext';
import { Navbar } from './components/Navbar';
import { SaLogin } from './pages/SaLogin';
import { SaDashboard } from './pages/SaDashboard';
import { ProvisionHotelPage } from './pages/ProvisionHotelPage';

const ProtectedRoute = ({ children }) => {
  const { user } = useSaAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function AppContent() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
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
