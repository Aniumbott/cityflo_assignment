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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder pages for future phases
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-ink dark:text-cloud">{title}</h2>
        <p className="mt-1 text-sm text-slate dark:text-ash">Coming soon</p>
      </div>
    </div>
  );
}

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
                      <PlaceholderPage title="All Invoices" />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="invoices/:id"
                  element={<InvoiceDetailPage />}
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
