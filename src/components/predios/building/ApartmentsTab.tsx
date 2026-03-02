import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useBuildingApartments, 
  useBuildingFloors,
  useApartmentProgress,
  useMarkApartmentDone,
  useUnmarkApartmentDone,
  useLastWorkedApartment,
  useNextApartments,
} from '@/hooks/predios/useApartments';
import { 
  useActiveLetterSession,
  useCreateLetterSession,
  useCompleteLetterSession,
  useCancelLetterSession,
} from '@/hooks/predios/useLetterSessions';
import { useCreateListLinkedSession, useListItem, useListItemNavigation } from '@/hooks/predios/useListExecution';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Mail, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Clock,
  MapPin,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface ApartmentsTabProps {
  buildingId: string;
  unitsGenerated: boolean;
  listItemId?: string;
  listId?: string;
}

export function ApartmentsTab({ buildingId, unitsGenerated, listItemId, listId }: ApartmentsTabProps) {
  const navigate = useNavigate();
  const { data: floors, isLoading: floorsLoading } = useBuildingFloors(buildingId);
  const { data: apartments, isLoading: apartmentsLoading } = useBuildingApartments(buildingId);
  const { data: progress } = useApartmentProgress(buildingId);
  const { data: lastWorked } = useLastWorkedApartment(buildingId);
  const { data: activeSession } = useActiveLetterSession(buildingId);
  const { data: listItem } = useListItem(listItemId);
  const listNavigation = useListItemNavigation(listId || '', listItemId);
  
  // Determine planned count from list item or default
  const plannedFromList = listItem?.letters_planned || 5;
  const completedFromList = listItem?.completed_letters_count || 0;
  const remainingForList = Math.max(0, plannedFromList - completedFromList);
  
  const { data: nextApartments } = useNextApartments(buildingId, remainingForList > 0 ? remainingForList : 10);
  
  const markDone = useMarkApartmentDone();
  const unmarkDone = useUnmarkApartmentDone();
  const createSession = useCreateLetterSession();
  const createListSession = useCreateListLinkedSession();
  const completeSession = useCompleteLetterSession();
  const cancelSession = useCancelLetterSession();
  
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [prepareCount, setPrepareCount] = useState(remainingForList > 0 ? remainingForList : 5);
  const [showPrepareDialog, setShowPrepareDialog] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Check if list item is now complete after marking apartments
  useEffect(() => {
    if (listItem && listItem.is_completed && !showCompletionDialog) {
      setShowCompletionDialog(true);
    }
  }, [listItem?.is_completed]);

  if (!unitsGenerated) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Unidades não geradas</p>
        <p className="text-sm mt-1">
          Os apartamentos serão gerados durante o cadastro inicial do prédio.
        </p>
      </div>
    );
  }

  if (floorsLoading || apartmentsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  const toggleFloor = (floorId: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorId)) {
        next.delete(floorId);
      } else {
        next.add(floorId);
      }
      return next;
    });
  };

  const handleToggleApartment = async (apartmentId: string, currentDone: boolean) => {
    if (currentDone) {
      await unmarkDone.mutateAsync({ apartmentId, listItemId, listId });
    } else {
      await markDone.mutateAsync({ apartmentId, listItemId, listId });
    }
  };

  const handlePrepareLetters = async () => {
    if (!nextApartments || nextApartments.length === 0) return;
    
    const selectedApts = nextApartments.slice(0, prepareCount);
    
    // If in list execution mode, create a linked session
    if (listItemId && listId) {
      await createListSession.mutateAsync({
        buildingId,
        listItemId,
        listId,
        plannedCount: prepareCount,
        apartmentIds: selectedApts.map(a => a.id),
      });
    } else {
      await createSession.mutateAsync({
        buildingId,
        plannedCount: prepareCount,
        apartmentIds: selectedApts.map(a => a.id),
      });
    }
    setShowPrepareDialog(false);
  };

  const handleGoToNextBuilding = () => {
    if (listNavigation.next && listId) {
      navigate(`/buildings/${listNavigation.next.building_id}?list=${listId}&item=${listNavigation.next.id}`);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    await completeSession.mutateAsync({ sessionId: activeSession.id, buildingId, listId });
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    await cancelSession.mutateAsync({ sessionId: activeSession.id, buildingId });
  };

  // Group apartments by floor
  const apartmentsByFloor = new Map<string, typeof apartments>();
  apartments?.forEach(apt => {
    const existing = apartmentsByFloor.get(apt.floor_id) || [];
    apartmentsByFloor.set(apt.floor_id, [...existing, apt]);
  });

  const progressPercent = progress ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Progresso Geral</span>
            <span className="text-sm font-medium">
              {progress?.done || 0} / {progress?.total || 0} apartamentos
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Último trabalhado:</span>
              <span className="font-medium">
                {lastWorked ? `Apt ${lastWorked.apartment_number}` : 'Nenhum'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Próximo sugerido:</span>
              <span className="font-medium">
                {nextApartments?.[0] ? `Apt ${nextApartments[0].apartment_number}` : 'Nenhum'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Session or Prepare Button */}
      {activeSession ? (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Sessão em Andamento
              </CardTitle>
              <Badge variant="default">
                {activeSession.apartments.filter(a => a.completed_at).length} / {activeSession.planned_count}
              </Badge>
            </div>
            <CardDescription>
              Planejado: {activeSession.planned_count} cartas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {activeSession.apartments.map(apt => (
                <Badge 
                  key={apt.id}
                  variant={apt.completed_at ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={async () => {
                    if (!apt.completed_at) {
                      await markDone.mutateAsync({ apartmentId: apt.apartment_id, listItemId, listId });
                    }
                  }}
                >
                  {apt.completed_at && <Check className="w-3 h-3 mr-1" />}
                  {apt.apartment.apartment_number}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleCompleteSession}
                disabled={completeSession.isPending}
              >
                {completeSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Concluir Sessão
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelSession}
                disabled={cancelSession.isPending}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Dialog open={showPrepareDialog} onOpenChange={setShowPrepareDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg" disabled={progress?.remaining === 0}>
              <Mail className="w-4 h-4 mr-2" />
              Preparar Cartas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Preparar Sessão de Cartas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prepare-count">Quantas cartas deseja preparar?</Label>
                <Input
                  id="prepare-count"
                  type="number"
                  min={1}
                  max={progress?.remaining || 50}
                  value={prepareCount}
                  onChange={(e) => setPrepareCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Restam {progress?.remaining || 0} apartamentos
                </p>
              </div>

              {nextApartments && nextApartments.length > 0 && (
                <div className="space-y-2">
                  <Label>Apartamentos selecionados:</Label>
                  <div className="flex flex-wrap gap-1 p-3 bg-muted rounded-lg">
                    {nextApartments.slice(0, prepareCount).map(apt => (
                      <Badge key={apt.id} variant="secondary">
                        {apt.apartment_number}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Continuando de onde parou, na ordem crescente
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button 
                onClick={handlePrepareLetters}
                disabled={createSession.isPending || !nextApartments?.length}
              >
                {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Iniciar Sessão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Floors List */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">Andares e Apartamentos</h4>
        {floors?.map(floor => {
          const floorApts = apartmentsByFloor.get(floor.id) || [];
          const floorDone = floorApts.filter(a => a.letter_done).length;
          const isExpanded = expandedFloors.has(floor.id);

          return (
            <Collapsible key={floor.id} open={isExpanded} onOpenChange={() => toggleFloor(floor.id)}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">{floor.floor_label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {floorDone} / {floorApts.length}
                    </span>
                    {floorDone === floorApts.length && floorApts.length > 0 && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3 border-x border-b rounded-b-lg">
                  {floorApts.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => handleToggleApartment(apt.id, apt.letter_done)}
                      disabled={markDone.isPending || unmarkDone.isPending}
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-md text-sm font-medium transition-colors ${
                        apt.letter_done
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {apt.letter_done && <Check className="w-3 h-3" />}
                      {apt.apartment_number}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* List Completion Dialog */}
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Prédio Concluído!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você completou a meta de {listItem?.letters_planned} cartas para este prédio nesta lista.
              {listNavigation.next ? ' Deseja ir para o próximo prédio?' : ' Este era o último prédio da lista.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar aqui</AlertDialogCancel>
            {listNavigation.next ? (
              <AlertDialogAction onClick={handleGoToNextBuilding}>
                Próximo prédio
                <ArrowRight className="w-4 h-4 ml-2" />
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => navigate(`/lists/${listId}`)}>
                Voltar para lista
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
