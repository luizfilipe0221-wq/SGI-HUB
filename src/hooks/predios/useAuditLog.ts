import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/predios/useAuth';

type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'USER_REGISTERED'
  | 'BUILDING_CREATED'
  | 'BUILDING_UPDATED'
  | 'BUILDING_DELETED'
  | 'BUILDING_WORKED'
  | 'LETTER_SENT'
  | 'LIST_GENERATED'
  | 'LIST_ITEM_COMPLETED'
  | 'LIST_ITEM_UPDATED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'FILE_UPLOADED'
  | 'EXTRACTION_PROCESSED'
  | 'EXTRACTION_REVIEWED'
  | 'DATA_EXPORTED'
  | 'UNITS_GENERATED'
  | 'SESSION_CREATED'
  | 'SESSION_COMPLETED'
  | 'SESSION_CANCELLED'
  | 'APARTMENT_MARKED';

type EntityType = 
  | 'user'
  | 'building'
  | 'territory'
  | 'generated_list'
  | 'generated_list_item'
  | 'permission'
  | 'role'
  | 'file'
  | 'extraction'
  | 'apartment'
  | 'letter_session';

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const log = useCallback(async ({
    action,
    entityType,
    entityId,
    oldData,
    newData,
  }: AuditLogParams): Promise<void> => {
    if (!user) return;

    try {
      // Use RPC to call the security definer function
      await supabase.rpc('create_audit_log', {
        _user_id: user.id,
        _action: action,
        _entity_type: entityType,
        _entity_id: entityId || null,
        _old_data: oldData ? JSON.stringify(oldData) : null,
        _new_data: newData ? JSON.stringify(newData) : null,
      });
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('Failed to create audit log:', error);
    }
  }, [user]);

  return { log };
}
