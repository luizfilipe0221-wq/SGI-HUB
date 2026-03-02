import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS, AuditLog } from '@/lib/predios/auth-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileText, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  USER_REGISTERED: 'Cadastro',
  BUILDING_CREATED: 'Prédio criado',
  BUILDING_UPDATED: 'Prédio atualizado',
  BUILDING_DELETED: 'Prédio excluído',
  BUILDING_WORKED: 'Prédio trabalhado',
  LETTER_SENT: 'Carta enviada',
  LIST_GENERATED: 'Lista gerada',
  LIST_ITEM_COMPLETED: 'Item concluído',
  PERMISSION_GRANTED: 'Permissão concedida',
  PERMISSION_REVOKED: 'Permissão revogada',
  ROLE_CHANGED: 'Role alterada',
  USER_DEACTIVATED: 'Usuário desativado',
  USER_ACTIVATED: 'Usuário ativado',
  FILE_UPLOADED: 'Arquivo enviado',
  EXTRACTION_PROCESSED: 'Extração processada',
  EXTRACTION_REVIEWED: 'Extração revisada',
  DATA_EXPORTED: 'Dados exportados',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuário',
  building: 'Prédio',
  territory: 'Território',
  generated_list: 'Lista',
  generated_list_item: 'Item de Lista',
  permission: 'Permissão',
  role: 'Role',
  file: 'Arquivo',
  extraction: 'Extração',
};

function AuditLogsContent() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = logs?.filter(log =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_id?.toLowerCase().includes(search.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const uniqueActions = [...new Set(logs?.map(l => l.action) || [])];
  const uniqueEntities = [...new Set(logs?.map(l => l.entity_type) || [])];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Logs de Auditoria
        </h1>
        <p className="text-muted-foreground mt-1">
          Histórico imutável de todas as ações do sistema
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>
                {ACTION_LABELS[action] || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Entidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as entidades</SelectItem>
            {uniqueEntities.map(entity => (
              <SelectItem key={entity} value={entity}>
                {ENTITY_LABELS[entity] || entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID Entidade</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.user_id ? `${log.user_id.slice(0, 8)}...` : 'Sistema'}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {log.new_data && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {JSON.stringify(log.new_data).slice(0, 50)}...
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogs() {
  return (
    <PermissionGate permission={PERMISSIONS.VIEW_AUDIT_LOGS} showDenied>
      <AuditLogsContent />
    </PermissionGate>
  );
}
