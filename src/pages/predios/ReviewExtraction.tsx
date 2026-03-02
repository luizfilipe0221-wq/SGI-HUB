import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExtractedBuildings, Extraction } from '@/hooks/predios/useExtractions';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS } from '@/lib/predios/auth-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  Import,
  Building2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function ReviewExtractionContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buildings, isLoading, updateBuilding, approveBuilding, rejectBuilding, importBuildings, importing } = useExtractedBuildings(id);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Fetch extraction details
  const { data: extraction } = useQuery({
    queryKey: ['extraction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extractions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Extraction;
    },
    enabled: !!id,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pendingIds = buildings?.filter(b => b.status === 'pending' || b.status === 'approved').map(b => b.id) || [];
      setSelectedIds(new Set(pendingIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleApproveSelected = async () => {
    for (const buildingId of selectedIds) {
      await approveBuilding(buildingId);
    }
    toast({ title: 'Sucesso', description: `${selectedIds.size} registro(s) aprovado(s)` });
    setSelectedIds(new Set());
  };

  const handleRejectSelected = async () => {
    for (const buildingId of selectedIds) {
      await rejectBuilding(buildingId);
    }
    toast({ title: 'Sucesso', description: `${selectedIds.size} registro(s) rejeitado(s)` });
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    const approvedIds = buildings?.filter(b => b.status === 'approved').map(b => b.id) || [];
    if (approvedIds.length === 0) {
      toast({ title: 'Atenção', description: 'Nenhum registro aprovado para importar', variant: 'destructive' });
      return;
    }
    await importBuildings(approvedIds);
    navigate('/buildings');
  };

  const handleEdit = (building: any) => {
    setEditingBuilding(building);
    setEditForm({
      name: building.name || '',
      full_address: building.full_address || '',
      address_street: building.address_street || '',
      address_number: building.address_number || '',
      address_neighborhood: building.address_neighborhood || '',
      address_city: building.address_city || '',
      address_state: building.address_state || '',
      address_zip: building.address_zip || '',
      units_total: building.units_total?.toString() || '',
      notes: building.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBuilding) return;
    
    await updateBuilding({
      id: editingBuilding.id,
      updates: {
        ...editForm,
        units_total: editForm.units_total ? parseInt(editForm.units_total) : null,
      },
    });
    
    toast({ title: 'Sucesso', description: 'Registro atualizado' });
    setEditingBuilding(null);
  };

  const pendingCount = buildings?.filter(b => b.status === 'pending').length || 0;
  const approvedCount = buildings?.filter(b => b.status === 'approved').length || 0;
  const rejectedCount = buildings?.filter(b => b.status === 'rejected').length || 0;
  const importedCount = buildings?.filter(b => b.status === 'imported').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/uploads')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revisar Extração</h1>
          <p className="text-muted-foreground mt-1">
            {extraction?.original_filename}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejeitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{importedCount}</p>
                <p className="text-sm text-muted-foreground">Importados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={handleApproveSelected}
          disabled={selectedIds.size === 0}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Aprovar ({selectedIds.size})
        </Button>
        <Button
          variant="outline"
          onClick={handleRejectSelected}
          disabled={selectedIds.size === 0}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Rejeitar ({selectedIds.size})
        </Button>
        <div className="flex-1" />
        <Button
          onClick={handleImport}
          disabled={approvedCount === 0 || importing}
        >
          {importing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Import className="w-4 h-4 mr-2" />
          )}
          Importar Aprovados ({approvedCount})
        </Button>
      </div>

      {/* Buildings table */}
      <Card>
        <CardHeader>
          <CardTitle>Prédios Extraídos ({buildings?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === (buildings?.filter(b => b.status !== 'imported' && b.status !== 'rejected').length || 0)}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome/Identificador</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alertas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings?.map((building) => (
                <TableRow key={building.id} className={building.status === 'rejected' ? 'opacity-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(building.id)}
                      onCheckedChange={(checked) => handleSelect(building.id, !!checked)}
                      disabled={building.status === 'imported' || building.status === 'rejected'}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {building.name || building.building_identifier || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {building.full_address || `${building.address_street || ''} ${building.address_number || ''}`.trim() || '-'}
                  </TableCell>
                  <TableCell>{building.address_city || '-'}</TableCell>
                  <TableCell>{building.units_total || '-'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        building.status === 'approved' ? 'default' :
                        building.status === 'rejected' ? 'destructive' :
                        building.status === 'imported' ? 'secondary' :
                        'outline'
                      }
                    >
                      {building.status === 'pending' ? 'Pendente' :
                       building.status === 'approved' ? 'Aprovado' :
                       building.status === 'rejected' ? 'Rejeitado' :
                       'Importado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {building.validation_errors && building.validation_errors.length > 0 && (
                      <Badge variant="outline" className="text-warning border-warning">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {building.validation_errors.length}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(building)}
                      disabled={building.status === 'imported'}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!buildings || buildings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum registro extraído
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingBuilding} onOpenChange={() => setEditingBuilding(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              Corrija os dados extraídos antes de importar
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome/Condomínio</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidades</Label>
              <Input
                type="number"
                value={editForm.units_total}
                onChange={(e) => setEditForm(prev => ({ ...prev, units_total: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Endereço Completo</Label>
              <Input
                value={editForm.full_address}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rua</Label>
              <Input
                value={editForm.address_street}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_street: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={editForm.address_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={editForm.address_neighborhood}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_neighborhood: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={editForm.address_city}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input
                value={editForm.address_state}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_state: e.target.value }))}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={editForm.address_zip}
                onChange={(e) => setEditForm(prev => ({ ...prev, address_zip: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Observações</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {editingBuilding?.validation_errors && editingBuilding.validation_errors.length > 0 && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="font-medium text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alertas de validação:
              </p>
              <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside">
                {editingBuilding.validation_errors.map((error: string, i: number) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBuilding(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReviewExtraction() {
  return (
    <PermissionGate permission={PERMISSIONS.REVIEW_EXTRACTION} showDenied>
      <ReviewExtractionContent />
    </PermissionGate>
  );
}
