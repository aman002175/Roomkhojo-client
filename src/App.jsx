import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google'; // 🚨 Naya import
import MainApp from './MainApp';
import AdminPanel from './AdminPanel';
import UserDashboard from './UserDashboard';

export default function App() {
  // 🔑 APNI GOOGLE CLIENT ID YAHAN PASTE KAREIN
  const googleClientId = "940437651153-iv8t4njjor1sqvjsn4k0pkpt7gt2ncdp.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/admin-secret-29" element={<AdminPanel />} />
          <Route path="/dashboard" element={<UserDashboard />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}
