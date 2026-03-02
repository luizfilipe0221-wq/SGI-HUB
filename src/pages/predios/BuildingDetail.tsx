import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useBuilding, useBuildingActivities, useUpdateBuilding, useMarkAsWorked, useUpdateProgress, useDeleteBuilding } from '@/hooks/predios/useBuildings';
import { useRecordBuildingChanges } from '@/hooks/predios/useBuildingChangeHistory';
import { useCustomFieldDefinitions, useBuildingCustomFieldValues, useSaveCustomFieldValues } from '@/hooks/predios/useCustomFields';
import { useListItem, useListItemNavigation } from '@/hooks/predios/useListExecution';
import { StatusBadge } from '@/components/predios/StatusBadge';
import { BuildingChangeHistoryTab } from '@/components/predios/building/BuildingChangeHistoryTab';
import { CustomFieldsRenderer } from '@/components/predios/building/CustomFieldsRenderer';
import { ApartmentsTab } from '@/components/predios/building/ApartmentsTab';
import { BuildingNotesPanel } from '@/components/predios/building/BuildingNotesPanel';
import { ListExecutionBanner } from '@/components/predios/building/ListExecutionBanner';
import { SessionsTab } from '@/components/predios/building/SessionsTab';
import { UndoButton } from '@/components/predios/UndoButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, CheckCircle, Edit, Trash2, Loader2, MapPin, Clock, Calendar, History, Home, FileStack } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getProgressPercentage, getTotalApartments } from '@/lib/predios/building-utils';

// Extended building type with new columns
interface ExtendedBuilding {
  units_generated?: boolean;
  units_generated_at?: string | null;
  numbering_starts_at?: number;
  apartments_per_floor_config?: number | null;
}

export default function BuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // List execution mode params
  const listId = searchParams.get('list');
  const listItemId = searchParams.get('item');
  const isListExecutionMode = !!(listId && listItemId);
  
  const { data: building, isLoading } = useBuilding(id!);
  const { data: activities } = useBuildingActivities(id!);
  const { data: listItem } = useListItem(listItemId || undefined);
  const listNavigation = useListItemNavigation(listId || '', listItemId || undefined);
  
  const updateBuilding = useUpdateBuilding();
  const markAsWorked = useMarkAsWorked();
  const updateProgress = useUpdateProgress();
  const deleteBuilding = useDeleteBuilding();
  const recordChanges = useRecordBuildingChanges();
  const saveCustomFieldValues = useSaveCustomFieldValues();
  const { data: customFields } = useCustomFieldDefinitions();
  const { data: customFieldValues } = useBuildingCustomFieldValues(id!);

  const [isEditing, setIsEditing] = useState(false);
  const [lettersCount, setLettersCount] = useState(5);
  const [editData, setEditData] = useState<any>(null);
  const [progressData, setProgressData] = useState({ floors: 0, apartments: 0 });
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string | null>>({});

  // Set suggested letters count from list item
  useEffect(() => {
    if (listItem && listItem.letters_planned) {
      setLettersCount(listItem.letters_planned - listItem.completed_letters_count);
    }
  }, [listItem]);

  // Handle navigation to next/previous building
  const handleListNavigation = (buildingId: string, itemId: string) => {
    navigate(`/buildings/${buildingId}?list=${listId}&item=${itemId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Prédio não encontrado</h2>
        <Button asChild variant="outline">
          <Link to="/buildings">Voltar para lista</Link>
        </Button>
      </div>
    );
  }

  // Type assertion for extended building properties
  const extendedBuilding = building as typeof building & ExtendedBuilding;
  const unitsGenerated = extendedBuilding.units_generated ?? false;

  const progress = getProgressPercentage(building);
  const totalApts = getTotalApartments(building);

  const handleSendLetters = async () => {
    await markAsWorked.mutateAsync({ buildingId: building.id, lettersCount });
  };

  const handleStartEdit = () => {
    setEditData({
      name: building.name,
      address: building.address,
      territory_id: building.territory_id,
      floors_count: building.floors_count,
      apartments_per_floor: building.apartments_per_floor,
      apartments_total: building.apartments_total,
      default_cycle_days: building.default_cycle_days,
      custom_cycle_days: building.custom_cycle_days,
      notes: building.notes || '',
    });
    // Initialize custom fields from saved values
    const cfValues: Record<string, string | null> = {};
    customFieldValues?.forEach(v => {
      cfValues[v.field_id] = v.value;
    });
    setCustomFieldsData(cfValues);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    // Detect changes and record them
    const changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];
    const fieldsToCheck = ['name', 'address', 'territory_id', 'floors_count', 'apartments_per_floor', 'apartments_total', 'default_cycle_days', 'custom_cycle_days', 'notes'];
    
    fieldsToCheck.forEach(field => {
      const oldVal = (building as any)[field];
      const newVal = editData[field];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changes.push({
          fieldName: field,
          oldValue: oldVal != null ? String(oldVal) : null,
          newValue: newVal != null ? String(newVal) : null,
        });
      }
    });

    await updateBuilding.mutateAsync({ id: building.id, ...editData });

    // Record changes in history
    if (changes.length > 0) {
      await recordChanges.mutateAsync({
        buildingId: building.id,
        changes,
        changeSource: 'manual',
      });
    }

    // Save custom field values
    if (Object.keys(customFieldsData).length > 0) {
      await saveCustomFieldValues.mutateAsync({
        buildingId: building.id,
        values: customFieldsData,
      });
    }

    setIsEditing(false);
  };

  const handleSaveProgress = async () => {
    await updateProgress.mutateAsync({
      buildingId: building.id,
      floorsDone: progressData.floors,
      apartmentsDone: progressData.apartments,
    });
  };

  const handleDelete = async () => {
    await deleteBuilding.mutateAsync(building.id);
    navigate('/buildings');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* List Execution Banner */}
      {isListExecutionMode && listId && listItemId && (
        <ListExecutionBanner 
          listId={listId} 
          listItemId={listItemId} 
          buildingId={building.id}
          onNavigate={handleListNavigation}
        />
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => isListExecutionMode ? navigate(`/lists/${listId}`) : navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{building.name}</h1>
            <StatusBadge status={building.status} label={building.status_label} />
          </div>
          <p className="text-muted-foreground mt-1">{building.address}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Território {building.territory_id}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Ciclo: {building.custom_cycle_days ?? building.default_cycle_days} dias
            </span>
          </div>
        </div>
      </div>

      {/* Building Notes Panel - Always visible */}
      <BuildingNotesPanel buildingId={building.id} />

      {/* Quick Actions */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="font-medium mb-3">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Mail className="w-4 h-4 mr-2" />
                Registrar Cartas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Cartas Enviadas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Quantidade de Cartas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={lettersCount}
                    onChange={(e) => setLettersCount(parseInt(e.target.value) || 1)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Isso também atualizará a data do último trabalho e recalculará o vencimento.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleSendLetters} disabled={markAsWorked.isPending}>
                    {markAsWorked.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Registrar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleStartEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir prédio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O prédio e todo seu histórico serão excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="apartments" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="apartments">
              <Home className="w-4 h-4 mr-1" />
              Apartamentos
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <FileStack className="w-4 h-4 mr-1" />
              Sessões
            </TabsTrigger>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="activity">Atividades</TabsTrigger>
            <TabsTrigger value="changes">
              <History className="w-4 h-4 mr-1" />
              Alterações
            </TabsTrigger>
          </TabsList>
          <UndoButton />
        </div>

        <TabsContent value="apartments" className="space-y-4">
          <ApartmentsTab 
            buildingId={building.id} 
            unitsGenerated={unitsGenerated}
            listItemId={listItemId || undefined}
            listId={listId || undefined}
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <SessionsTab buildingId={building.id} />
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <div className="glass-card rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Andares</span>
                <p className="font-medium">{building.floors_count}</p>
              </div>
              {building.apartments_per_floor && (
                <div>
                  <span className="text-muted-foreground">Apts/Andar</span>
                  <p className="font-medium">{building.apartments_per_floor}</p>
                </div>
              )}
              {totalApts && (
                <div>
                  <span className="text-muted-foreground">Total Apts</span>
                  <p className="font-medium">{totalApts}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Última Carta</span>
                <p className="font-medium">
                  {building.last_letter_sent_at 
                    ? format(new Date(building.last_letter_sent_at), "dd/MM/yyyy", { locale: ptBR })
                    : 'Nunca'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimento</span>
                <p className="font-medium">
                  {building.due_date 
                    ? format(building.due_date, "dd/MM/yyyy", { locale: ptBR })
                    : 'Concluído'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Unidades Geradas</span>
                <p className="font-medium">{unitsGenerated ? 'Sim' : 'Não'}</p>
              </div>
            </div>
            {building.notes && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Observações Gerais</span>
                <p className="mt-1">{building.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progresso Geral</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Andares feitos</span>
                <p className="font-medium">{building.progress_floors_done} / {building.floors_count}</p>
              </div>
              {totalApts && (
                <div>
                  <span className="text-muted-foreground">Apartamentos feitos</span>
                  <p className="font-medium">{building.progress_apartments_done} / {totalApts}</p>
                </div>
              )}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setProgressData({
                    floors: building.progress_floors_done,
                    apartments: building.progress_apartments_done,
                  })}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Atualizar Progresso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atualizar Progresso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Andares Concluídos</Label>
                    <Input
                      type="number"
                      min={0}
                      max={building.floors_count}
                      value={progressData.floors}
                      onChange={(e) => setProgressData(p => ({ ...p, floors: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apartamentos Concluídos</Label>
                    <Input
                      type="number"
                      min={0}
                      max={totalApts || 9999}
                      value={progressData.apartments}
                      onChange={(e) => setProgressData(p => ({ ...p, apartments: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleSaveProgress}>Salvar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            {!activities || activities.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              <div className="divide-y">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {activity.activity_type === 'LETTER_SENT' && <Mail className="w-4 h-4 text-primary" />}
                      {activity.activity_type === 'WORKED' && <CheckCircle className="w-4 h-4 text-primary" />}
                      {activity.activity_type === 'PROGRESS_UPDATE' && <CheckCircle className="w-4 h-4 text-success" />}
                      {activity.activity_type === 'NOTE' && <Calendar className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {activity.activity_type === 'LETTER_SENT' && `${activity.letters_count || 0} carta(s) enviada(s)`}
                        {activity.activity_type === 'WORKED' && 'Trabalho realizado'}
                        {activity.activity_type === 'PROGRESS_UPDATE' && 'Progresso atualizado'}
                        {activity.activity_type === 'NOTE' && 'Nota adicionada'}
                      </p>
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground">{activity.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.activity_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <BuildingChangeHistoryTab buildingId={building.id} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Prédio</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Território</Label>
                  <Select
                    value={editData.territory_id.toString()}
                    onValueChange={(v) => setEditData({ ...editData, territory_id: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(t => (
                        <SelectItem key={t} value={t.toString()}>T{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Andares</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.floors_count}
                    onChange={(e) => setEditData({ ...editData, floors_count: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Apts/Andar</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editData.apartments_per_floor ?? ''}
                    onChange={(e) => setEditData({ ...editData, apartments_per_floor: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Apts</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editData.apartments_total ?? ''}
                    onChange={(e) => setEditData({ ...editData, apartments_total: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciclo Padrão (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.default_cycle_days}
                    onChange={(e) => setEditData({ ...editData, default_cycle_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciclo Personalizado</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editData.custom_cycle_days ?? ''}
                    onChange={(e) => setEditData({ ...editData, custom_cycle_days: e.target.value ? parseInt(e.target.value) : null })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Custom Fields */}
              {customFields && customFields.length > 0 && (
                <CustomFieldsRenderer
                  buildingId={building.id}
                  values={customFieldsData}
                  onChange={(fieldId, value) => setCustomFieldsData(prev => ({ ...prev, [fieldId]: value }))}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={updateBuilding.isPending}>
              {updateBuilding.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
