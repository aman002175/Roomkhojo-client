import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

// M6 fix: route-wise code splitting — pehla load chhota, baaki pages demand par
const MainApp = lazy(() => import('./MainApp'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const UserDashboard = lazy(() => import('./UserDashboard'));
const LegalPage = lazy(() => import('./LegalPage'));

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://roomkhojo-api.onrender.com';
const DEFAULT_ADMIN_PATH = '/admin-secret-29';

// Path normalize: / se shuru ho, aas-paas space na ho
const normalizePath = (raw, fallback) => {
  const p = String(raw || fallback || DEFAULT_ADMIN_PATH).trim();
  return p.startsWith('/') ? p : `/${p}`;
};

const PageLoader = () => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-white">
    <p className="font-black text-gray-400 animate-pulse">RoomKhojo loading…</p>
  </div>
);

export default function App() {
  // 🔑 Google Client ID ab .env file se aata hai (VITE_GOOGLE_CLIENT_ID)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 🔒 Admin path BACKEND se aata hai (DB settings) — env sirf fallback.
  // Backend na mile toh VITE_ADMIN_PATH, warna default. (No extra fetch lib.)
  const [adminPath, setAdminPath] = useState(() => normalizePath(import.meta.env.VITE_ADMIN_PATH));

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings && data.settings.adminPath) {
          setAdminPath(normalizePath(data.settings.adminPath));
        }
      })
      .catch(() => { /* backend na mile toh env/default path chalta rahega */ });
  }, []);

  if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID set nahi hai — Google login kaam nahi karega.');
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path={adminPath} element={<AdminPanel />} />
            <Route path="/dashboard" element={<UserDashboard />} />

            {/* ── Legal Pages ── */}
            <Route path="/about" element={<LegalPage type="about" />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="/refund" element={<LegalPage type="refund" />} />
          </Routes>
        </Suspense>
      </Router>
    </GoogleOAuthProvider>
  );
}
