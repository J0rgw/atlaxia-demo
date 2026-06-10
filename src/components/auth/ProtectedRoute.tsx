import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requiredPage,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canAccessPage = useAuthStore((state) => state.canAccessPage);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const session = useAuthStore((state) => state.session);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (session?.license && !session.license.is_active) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Licencia Inactiva</h1>
          <p className="text-[var(--text-secondary)]">
            Tu licencia no esta activa. Contacta con soporte.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPage && !canAccessPage(requiredPage)) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
