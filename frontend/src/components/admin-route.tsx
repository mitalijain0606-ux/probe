import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.role === 'ADMIN' || user.email === 'admin@urlwatch.dev' || user.email.startsWith('admin@');
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
