import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-midnight">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-midnight">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink dark:text-cloud">Access Denied</h1>
          <p className="mt-2 text-slate dark:text-ash">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
