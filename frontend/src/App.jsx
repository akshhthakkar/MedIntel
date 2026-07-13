import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts & Guards
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';

// Public Pages (Eagerly Loaded)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy Loaded Pages
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage'));

const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UploadPage = React.lazy(() => import('./pages/UploadPage'));
const ReportsListPage = React.lazy(() => import('./pages/ReportsListPage'));
const ReportDetailPage = React.lazy(() => import('./pages/ReportDetailPage'));
const ReportComparePage = React.lazy(() => import('./pages/ReportComparePage'));
const MedicationsPage = React.lazy(() => import('./pages/MedicationsPage'));
const SymptomsPage = React.lazy(() => import('./pages/SymptomsPage'));
const TrendsPage = React.lazy(() => import('./pages/TrendsPage'));
const TimelinePage = React.lazy(() => import('./pages/TimelinePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Public route redirect tool
const PublicOnly = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            success: {
              style: {
                background: '#f0fdf4',
                border: '1px solid #16a34a',
                color: '#15803d'
              },
              iconTheme: { primary: '#16a34a', secondary: '#fff' }
            },
            error: {
              style: {
                background: '#fef2f2',
                border: '1px solid #dc2626',
                color: '#dc2626'
              },
              duration: 6000
            },
            loading: {
              style: {
                background: '#eff6ff',
                border: '1px solid #3b82f6',
                color: '#1d4ed8'
              }
            }
          }}
        />
        <Routes>
          {/* Public Routes (redirect to dashboard if logged in) */}
          <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          
          <Route path="/forgot-password" element={
            <PublicOnly>
              <Suspense fallback={<PageFallback />}><ForgotPasswordPage /></Suspense>
            </PublicOnly>
          } />
          <Route path="/reset-password/:token" element={
            <PublicOnly>
              <Suspense fallback={<PageFallback />}><ResetPasswordPage /></Suspense>
            </PublicOnly>
          } />
          
          <Route path="/verify-email/:token" element={
            <Suspense fallback={<PageFallback />}><EmailVerificationPage /></Suspense>
          } />

          {/* Protected Routes (require auth, wrapped in ErrorBoundary and Suspense) */}
          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><DashboardPage /></Suspense></ErrorBoundary>} />
              <Route path="/upload" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><UploadPage /></Suspense></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><ReportsListPage /></Suspense></ErrorBoundary>} />
              <Route path="/reports/compare" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><ReportComparePage /></Suspense></ErrorBoundary>} />
              <Route path="/reports/:id" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><ReportDetailPage /></Suspense></ErrorBoundary>} />
              <Route path="/medications" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><MedicationsPage /></Suspense></ErrorBoundary>} />
              <Route path="/symptoms" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><SymptomsPage /></Suspense></ErrorBoundary>} />
              <Route path="/trends" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><TrendsPage /></Suspense></ErrorBoundary>} />
              <Route path="/timeline" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><TimelinePage /></Suspense></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><SettingsPage /></Suspense></ErrorBoundary>} />
              <Route path="/notifications" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense></ErrorBoundary>} />
            </Route>
          </Route>

          {/* 404 Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
