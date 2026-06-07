import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import MainApp from './MainApp';
import AdminPanel from './AdminPanel';
import UserDashboard from './UserDashboard';
import LegalPage from './LegalPage';

export default function App() {
  // 🔑 Google Client ID ab .env file se aata hai (VITE_GOOGLE_CLIENT_ID)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/admin-secret-29" element={<AdminPanel />} />
          <Route path="/dashboard" element={<UserDashboard />} />

          {/* ── Legal Pages ── */}
          <Route path="/about" element={<LegalPage type="about" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/refund" element={<LegalPage type="refund" />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

