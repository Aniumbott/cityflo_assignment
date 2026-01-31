import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText } from 'lucide-react';
import axios from 'axios';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ThemeToggle from '../components/ui/ThemeToggle';

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'EMPLOYEE':
      return '/submissions';
    case 'ACCOUNTS':
    case 'SENIOR_ACCOUNTS':
      return '/invoices';
    default:
      return '/';
  }
}

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated && user) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    return <Navigate to={from ?? getDefaultRoute(user.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? '/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-midnight flex items-center justify-center px-4 transition-colors">
      {/* Theme toggle in corner */}
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand text-black mb-4">
            <FileText className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-ink dark:text-cloud">Cityflo Invoice System</h1>
          <p className="mt-1 text-sm text-slate dark:text-ash">Sign in to your account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
                <p className="text-sm text-error dark:text-error-dark">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink dark:text-cloud mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-surface dark:bg-charcoal px-4 py-3 text-sm text-ink dark:text-cloud placeholder-slate dark:placeholder-ash focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink dark:text-cloud mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-surface dark:bg-charcoal px-4 py-3 text-sm text-ink dark:text-cloud placeholder-slate dark:placeholder-ash focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
