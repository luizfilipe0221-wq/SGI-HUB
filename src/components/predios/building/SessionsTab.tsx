import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useBuildingSessionsDetailed, 
  useCanManageProgress, 
  useDeleteSession,
  useUnmarkSessionApartment,
} from '@/hooks/predios/useSessionManagement';
import { SessionWithDetails } from '@/lib/predios/list-generation-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, ChevronDown, ChevronRight, Undo2, Calendar, User, FileStack, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionsTabProps {
  buildingId: string;
}

export function SessionsTab({ buildingId }: SessionsTabProps) {
  const { data: sessions, isLoading } = useBuildingSessionsDetailed(buildingId);
  const canManage = useCanManageProgress();
  const deleteSession = useDeleteSession();
  const unmarkApartment = useUnmarkSessionApartment();

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusBadge = (status: SessionWithDetails['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelada</Badge>;
      case 'in_progress':
      default:
        return <Badge variant="outline" className="border-primary text-primary">Em andamento</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileStack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma sessão registrada</h3>
          <p className="text-muted-foreground">
            As sessões de cartas aparecerão aqui após iniciar o trabalho.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico de Sessões</h3>
        <span className="text-sm text-muted-foreground">
          {sessions.length} sessão(ões) registrada(s)
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id);
          const completedApts = session.apartments.filter(a => a.completed_at).length;

          return (
            <Card key={session.id} className={cn(
              "transition-shadow",
              session.status === 'cancelled' && "opacity-60"
            )}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(session.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{completedApts}/{session.planned_count} cartas</span>
                            {session.list_item && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <FileStack className="w-3 h-3" />
                                  {session.list_item.generated_list.name}
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(session.status)}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {/* Apartments list */}
                    <div className="space-y-2 mb-4">
                      {session.apartments.map((apt) => (
                        <div 
                          key={apt.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-sm",
                            apt.completed_at ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {apt.completed_at ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span>
                              {apt.apartment.floor?.floor_label || 'Andar ?'} - Apt {apt.apartment.apartment_number}
                            </span>
                            {apt.completed_at && (
                              <span className="text-xs text-muted-foreground">
                                ({format(new Date(apt.completed_at), "HH:mm", { locale: ptBR })})
                              </span>
                            )}
                          </div>

                          {canManage && apt.completed_at && session.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                unmarkApartment.mutate({
                                  sessionApartmentId: apt.id,
                                  apartmentId: apt.apartment_id,
                                  buildingId,
                                  sessionId: session.id,
                                });
                              }}
                              disabled={unmarkApartment.isPending}
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              Desmarcar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Session actions */}
                    {canManage && session.status !== 'cancelled' && (
                      <div className="flex justify-end border-t pt-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir Sessão
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
                                <br /><br />
                                Ao excluir esta sessão:
                                <ul className="list-disc pl-4 mt-2 space-y-1">
                                  <li>Todos os {completedApts} apartamento(s) marcados serão revertidos</li>
                                  <li>O progresso do prédio será recalculado</li>
                                  <li>Se vinculada a uma lista, o progresso da lista também será atualizado</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSession.mutate({ session, buildingId })}
                                className="bg-destructive"
                              >
                                Excluir e Reverter
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}

                    {session.notes && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Notas:</strong> {session.notes}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
