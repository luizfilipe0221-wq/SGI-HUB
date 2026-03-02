import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePredios as supabase } from '@/integrations/supabase/predios';
import { useAuth } from '@/hooks/predios/useAuth';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { useAuditLog } from '@/hooks/predios/useAuditLog';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS, Permission, AppRole } from '@/lib/predios/auth-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Users, Shield, Search, UserCog, Lock, Unlock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  is_active: boolean;
  permissions: string[];
}

function ManageUsersContent() {
  const { user: currentUser } = useAuth();
  const { log } = useAuditLog();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<AppRole>('user');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch all users with their roles and permissions
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get all user permissions with permission codes
      const { data: userPerms, error: permsError } = await supabase
        .from('user_permissions')
        .select('user_id, permission_id, permissions(code)');

      if (permsError) throw permsError;

      // Get user emails from auth (via profiles user_id)
      const userIds = profiles?.map(p => p.user_id) || [];
      
      // Build user data
      const userData: UserData[] = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userPermissions = userPerms
          ?.filter(up => up.user_id === profile.user_id)
          .map((up: any) => up.permissions?.code)
          .filter(Boolean) || [];

        return {
          id: profile.user_id,
          email: 'Carregando...', // Will be fetched separately
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || 'user',
          is_active: profile.is_active,
          permissions: userPermissions,
        };
      }) || [];

      return userData;
    },
  });

  // Fetch all available permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('admin_only', { ascending: true })
        .order('name');

      if (error) throw error;
      return data as Permission[];
    },
  });

  // Toggle user active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: isActive,
          deactivated_at: isActive ? null : new Date().toISOString(),
          deactivated_by: isActive ? null : currentUser?.id,
        })
        .eq('user_id', userId);

      if (error) throw error;

      await log({
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'user',
        entityId: userId,
        newData: { is_active: isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Sucesso', description: 'Status do usuário atualizado' });
    },
    onError: (error) => {
      console.error('Toggle active error:', error);
      toast({ title: 'Erro', description: 'Falha ao atualizar status', variant: 'destructive' });
    },
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;

      await log({
        action: 'ROLE_CHANGED',
        entityType: 'role',
        entityId: userId,
        newData: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  // Update user permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissionCodes }: { userId: string; permissionCodes: string[] }) => {
      // Get permission IDs
      const { data: perms } = await supabase
        .from('permissions')
        .select('id, code')
        .in('code', permissionCodes.length > 0 ? permissionCodes : ['_none_']);

      const permIds = perms?.map(p => p.id) || [];

      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions
      if (permIds.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permIds.map(permId => ({
            user_id: userId,
            permission_id: permId,
            granted_by: currentUser?.id,
          })));

        if (error) throw error;
      }

      await log({
        action: 'PERMISSION_GRANTED',
        entityType: 'permission',
        entityId: userId,
        newData: { permissions: permissionCodes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions);
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      // Update role if changed
      if (editRole !== selectedUser.role) {
        await updateRoleMutation.mutateAsync({ userId: selectedUser.id, role: editRole });
      }

      // Update permissions if not admin (admins have all perms automatically)
      if (editRole !== 'admin') {
        await updatePermissionsMutation.mutateAsync({
          userId: selectedUser.id,
          permissionCodes: editPermissions,
        });
      }

      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso' });
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Save user error:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar alterações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users?.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const togglePermission = (code: string) => {
    setEditPermissions(prev =>
      prev.includes(code)
        ? prev.filter(p => p !== code)
        : [...prev, code]
    );
  };

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciar Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie usuários, roles e permissões do sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.id.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role === 'admin' ? 'Admin' : 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.is_active ? (
                        <Badge variant="outline" className="text-success border-success">
                          <Unlock className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-destructive border-destructive">
                          <Lock className="w-3 h-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.role === 'admin' ? (
                      <span className="text-sm text-muted-foreground">Todas</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {user.permissions.length} permissão(ões)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        <UserCog className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant={user.is_active ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({
                          userId: user.id,
                          isActive: !user.is_active,
                        })}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              ID: {selectedUser?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editRole === 'admin' && (
                <p className="text-sm text-muted-foreground">
                  Admins têm acesso a todas as permissões automaticamente.
                </p>
              )}
            </div>

            {/* Permissions */}
            {editRole !== 'admin' && (
              <div className="space-y-3">
                <Label>Permissões</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allPermissions?.filter(p => !p.admin_only).map((perm) => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{perm.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {perm.description}
                        </div>
                      </div>
                      <Switch
                        checked={editPermissions.includes(perm.code)}
                        onCheckedChange={() => togglePermission(perm.code)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ManageUsers() {
  return (
    <PermissionGate permission={PERMISSIONS.MANAGE_USERS} showDenied>
      <ManageUsersContent />
    </PermissionGate>
  );
}
