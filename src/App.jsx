import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

// M6 fix: route-wise code splitting — pehla load chhota, baaki pages demand par
const MainApp = lazy(() => import('./MainApp'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const UserDashboard = lazy(() => import('./UserDashboard'));
const LegalPage = lazy(() => import('./LegalPage'));

const PageLoader = () => (
  <div className="h-[100dvh] w-full flex items-center justify-center bg-white">
    <p className="font-black text-gray-400 animate-pulse">RoomKhojo loading…</p>
  </div>
);

export default function App() {
  // 🔑 Google Client ID ab .env file se aata hai (VITE_GOOGLE_CLIENT_ID)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 🔒 Admin panel ka secret path bhi env se (Vercel me badlo, repo me nahi).
  // NOTE: ye bundle me dikhega — obscurity layer hai, asli security JWT hai.
  // Env badalne ke baad Vercel par redeploy zaroori hai (build-time value).
  const rawAdminPath = import.meta.env.VITE_ADMIN_PATH || '/admin-secret-29';
  const adminPath = rawAdminPath.startsWith('/') ? rawAdminPath : `/${rawAdminPath}`;

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
