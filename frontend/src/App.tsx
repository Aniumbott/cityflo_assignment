import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import SubmissionsPage from './pages/SubmissionsPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import AllInvoicesPage from './pages/AllInvoicesPage';
import InvoiceReviewPage from './pages/InvoiceReviewPage';
import AnalyticsPage from './pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Employee routes */}
                <Route
                  path="upload"
                  element={
                    <ProtectedRoute roles={['EMPLOYEE']}>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="submissions"
                  element={
                    <ProtectedRoute roles={['EMPLOYEE']}>
                      <SubmissionsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Accounts routes */}
                <Route
                  path="invoices"
                  element={
                    <ProtectedRoute roles={['ACCOUNTS', 'SENIOR_ACCOUNTS']}>
                      <AllInvoicesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="invoices/:id"
                  element={<InvoiceDetailRouteSwitch />}
                />
                <Route
                  path="analytics"
                  element={
                    <ProtectedRoute roles={['ACCOUNTS', 'SENIOR_ACCOUNTS']}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect based on role handled by index */}
                <Route index element={<RoleBasedRedirect />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="top-right" />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function InvoiceDetailRouteSwitch() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'ACCOUNTS' || user.role === 'SENIOR_ACCOUNTS') {
    return <InvoiceReviewPage />;
  }
  return <InvoiceDetailPage />;
}

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case 'EMPLOYEE':
      return <Navigate to="/submissions" replace />;
    case 'ACCOUNTS':
    case 'SENIOR_ACCOUNTS':
      return <Navigate to="/invoices" replace />;
    default:
      return null;
  }
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-midnight">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-ink dark:text-cloud">404</h1>
        <p className="mt-2 text-slate dark:text-ash">Page not found</p>
        <a href="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:text-brand-hover">
          Go home
        </a>
      </div>
    </div>
  );
}

export default App;
