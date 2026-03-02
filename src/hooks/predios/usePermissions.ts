/**
 * Stub usePermissions for the Gestão de Prédios module.
 * Since authentication is handled by the SGI, we grant full admin access
 * without making any Supabase queries.
 */
import { useCallback } from 'react';
import { AppRole, Permission, PermissionCode } from '@/lib/predios/auth-types';

interface UsePermissionsReturn {
  isAdmin: boolean;
  role: AppRole | null;
  permissions: string[];
  allPermissions: Permission[];
  loading: boolean;
  hasPermission: (code: PermissionCode) => boolean;
  canAccess: (requiredPermissions: PermissionCode[]) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  // SGI admin always has full access — no Supabase query needed
  const hasPermission = useCallback((_code: PermissionCode): boolean => true, []);
  const canAccess = useCallback((_codes: PermissionCode[]): boolean => true, []);

  return {
    isAdmin: true,
    role: 'admin',
    permissions: [],
    allPermissions: [],
    loading: false,
    hasPermission,
    canAccess,
    refetch: async () => { },
  };
}

export function useHasPermission(_code: PermissionCode): boolean {
  return true;
}
