// Auth & RBAC types

export type AppRole = 'admin' | 'user';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  admin_only: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface UserWithDetails {
  id: string;
  email: string;
  created_at: string;
  profile: Profile | null;
  roles: UserRole[];
  permissions: UserPermission[];
}

// Permission codes as constants
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_PREDIOS: 'view_predios',
  CREATE_PREDIOS: 'create_predios',
  EDIT_PREDIOS: 'edit_predios',
  DELETE_PREDIOS: 'delete_predios',
  UPLOAD_FILES: 'upload_files',
  PROCESS_EXTRACTION: 'process_extraction',
  REVIEW_EXTRACTION: 'review_extraction',
  EXPORT_DATA: 'export_data',
  GENERATE_LISTS: 'generate_lists',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_PROGRESS: 'manage_progress',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];
