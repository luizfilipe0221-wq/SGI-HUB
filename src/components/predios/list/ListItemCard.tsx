import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListItemWithProgress, useUpdatePlannedLetters, useCompleteListItem, useUndoCompleteListItem } from '@/hooks/predios/useListExecution';
import { usePermissions } from '@/hooks/predios/usePermissions';
import { StatusBadge } from '@/components/predios/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  MapPin, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Edit2, 
  ArrowRight, 
  Loader2,
  Building2,
  Check,
  Undo2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BuildingWithStatus } from '@/lib/predios/types';

function getStatusLabel(status: BuildingWithStatus['status']): string {
  switch (status) {
    case 'expired': return 'Venc.';
    case 'warning': return 'Atenção';
    case 'success': return 'OK';
    case 'completed': return 'Concluído';
    case 'not_started': return 'Novo';
    default: return 'OK';
  }
}

interface ListItemCardProps {
  item: ListItemWithProgress;
  listId: string;
}

export function ListItemCard({ item, listId }: ListItemCardProps) {
  const updatePlanned = useUpdatePlannedLetters();
  const completeItem = useCompleteListItem();
  const undoComplete = useUndoCompleteListItem();
  const { isAdmin, hasPermission } = usePermissions();
  
  const [editCount, setEditCount] = useState(item.letters_planned);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showUndoDialog, setShowUndoDialog] = useState(false);
  const [completionReason, setCompletionReason] = useState('');

  const progressPercent = item.letters_planned > 0 
    ? Math.min(100, Math.round((item.completed_letters_count / item.letters_planned) * 100))
    : 0;

  const canCompleteWithoutReason = item.completed_letters_count >= item.letters_planned;
  const canUndoCompletion = isAdmin || hasPermission('manage_progress');

  const getStatus = () => {
    if (item.is_completed) return 'done';
    if (item.completed_letters_count > 0) return 'in_progress';
    return 'pending';
  };

  const status = getStatus();

  const handleUpdatePlanned = async () => {
    await updatePlanned.mutateAsync({
      itemId: item.id,
      plannedCount: editCount,
      listId,
    });
    setShowEditDialog(false);
  };

  const handleComplete = async () => {
    await completeItem.mutateAsync({
      itemId: item.id,
      listId,
      buildingId: item.building_id,
      reason: canCompleteWithoutReason ? undefined : completionReason,
    });
    setShowCompleteDialog(false);
    setCompletionReason('');
  };

  const handleUndoComplete = async () => {
    await undoComplete.mutateAsync({
      itemId: item.id,
      listId,
    });
    setShowUndoDialog(false);
  };

  return (
    <div 
      className={`group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
        status === 'done'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : status === 'in_progress'
          ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
          : 'bg-card border-border hover:border-primary/50'
      }`}
    >
      {/* Status Icon */}
      <div className="absolute -top-2 -right-2">
        {status === 'done' && (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Building Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          status === 'done'
            ? 'bg-green-100 dark:bg-green-900/50'
            : status === 'in_progress'
            ? 'bg-amber-100 dark:bg-amber-900/50'
            : 'bg-primary/10'
        }`}>
          <Building2 className={`w-6 h-6 ${
            status === 'done'
              ? 'text-green-600 dark:text-green-400'
              : status === 'in_progress'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-primary'
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className={`font-semibold truncate ${status === 'done' ? 'text-muted-foreground' : ''}`}>
                {item.building?.name || 'Prédio'}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {item.building?.address || 'Endereço não disponível'}
              </p>
            </div>
            {!item.is_completed && item.building && (
              <StatusBadge 
                status={item.building.status} 
                label={getStatusLabel(item.building.status)} 
                className="flex-shrink-0"
              />
            )}
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              T{item.building?.territory_id}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Venc: {format(new Date(item.snapshot_due_date), "dd/MM", { locale: ptBR })}
            </span>
          </div>

          {/* Progress Section */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {item.completed_letters_count} / {item.letters_planned} cartas
                </span>
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                  <DialogTrigger asChild>
                    <button 
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCount(item.letters_planned);
                      }}
                    >
                      <Edit2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DialogTrigger>
                  <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                      <DialogTitle>Meta de Cartas</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <label className="text-sm text-muted-foreground mb-2 block">
                        Quantas cartas planeja entregar neste prédio?
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={editCount}
                        onChange={(e) => setEditCount(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {item.completed_letters_count} já foram entregues
                      </p>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button 
                        onClick={handleUpdatePlanned}
                        disabled={updatePlanned.isPending}
                      >
                        {updatePlanned.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Badge variant={status === 'done' ? 'default' : status === 'in_progress' ? 'secondary' : 'outline'}>
                {status === 'done' ? 'Concluído' : status === 'in_progress' ? 'Em andamento' : 'Pendente'}
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t flex justify-end gap-2">
        {status === 'done' ? (
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={`/buildings/${item.building_id}?list=${listId}&item=${item.id}`}>
                Ver Detalhes
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            {canUndoCompletion && (
              <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">
                    <Undo2 className="w-4 h-4 mr-1" />
                    Desfazer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desfazer conclusão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá remover a marcação de concluído deste prédio na lista.
                      O prédio voltará ao status anterior e poderá ser trabalhado novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleUndoComplete}
                      disabled={undoComplete.isPending}
                    >
                      {undoComplete.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Desfazer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        ) : (
          <>
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                  <Check className="w-4 h-4 mr-1" />
                  Concluído
                </Button>
              </DialogTrigger>
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Confirmar Conclusão</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Progresso atual:</span>
                    <span className="font-medium">
                      {item.completed_letters_count} / {item.letters_planned} cartas
                    </span>
                  </div>

                  {!canCompleteWithoutReason && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-amber-600">
                        Meta não atingida. Informe o motivo:
                      </label>
                      <Textarea
                        placeholder="Ex: Portaria não liberou, prédio em obras, apartamentos vagos..."
                        value={completionReason}
                        onChange={(e) => setCompletionReason(e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Este motivo será registrado no histórico de auditoria.
                      </p>
                    </div>
                  )}

                  {canCompleteWithoutReason && (
                    <p className="text-sm text-green-600">
                      ✓ Meta atingida! Você pode confirmar a conclusão.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleComplete}
                    disabled={completeItem.isPending || (!canCompleteWithoutReason && !completionReason.trim())}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {completeItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirmar Conclusão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button asChild size="sm">
              <Link to={`/buildings/${item.building_id}?list=${listId}&item=${item.id}`}>
                Executar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}