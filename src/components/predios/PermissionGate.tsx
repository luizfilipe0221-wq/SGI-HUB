import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { PermissionCode } from '@/lib/predios/auth-types';
import { Loader2, Lock } from 'lucide-react';

interface PermissionGateProps {
  permission: PermissionCode | PermissionCode[];
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
  showDenied?: boolean;
}

export function PermissionGate({
  permission,
  children,
  fallback,
  showLoading = true,
  showDenied = false,
}: PermissionGateProps) {
  const { hasPermission, canAccess, loading } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAccess = Array.isArray(permission)
    ? canAccess(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    if (fallback) return <>{fallback}</>;
    if (showDenied) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Acesso Negado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Você não tem permissão para acessar este recurso.
          </p>
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}

// Higher-order component version
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: PermissionCode | PermissionCode[]
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate permission={permission} showDenied>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}
