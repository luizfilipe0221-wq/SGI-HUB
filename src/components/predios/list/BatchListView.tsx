import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useListBatches, useUpdateListBatch, useDeleteListBatch } from '@/hooks/predios/useListBatches';
import { useNavigate } from 'react-router-dom';
import { BatchWithLists } from '@/lib/predios/list-generation-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileStack, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Trash2, 
  Pencil, 
  Check, 
  X,
  Sparkles,
  Wrench,
} from 'lucide-react';

export function BatchListView() {
  const navigate = useNavigate();
  const { data: batches, isLoading } = useListBatches();
  const updateBatch = useUpdateListBatch();
  const deleteBatch = useDeleteListBatch();

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditing = (batch: BatchWithLists) => {
    setEditingBatch(batch.id);
    setEditName(batch.name);
  };

  const saveEdit = async (id: string) => {
    if (id !== 'legacy') {
      await updateBatch.mutateAsync({ id, name: editName });
    }
    setEditingBatch(null);
  };

  const cancelEdit = () => {
    setEditingBatch(null);
    setEditName('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileStack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma lista gerada</h3>
          <p className="text-muted-foreground mb-4">
            Gere sua primeira lista de trabalho para começar.
          </p>
          <Button onClick={() => navigate('/generate')}>
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Listas
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => {
        const isExpanded = expandedBatches.has(batch.id);
        const isEditing = editingBatch === batch.id;
        const progress = batch.total_buildings > 0 
          ? Math.round((batch.completed_buildings / batch.total_buildings) * 100)
          : 0;

        return (
          <Card key={batch.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(batch.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" onClick={() => saveEdit(batch.id)}>
                            <Check className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit}>
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {batch.name}
                            <Badge variant={batch.generation_mode === 'auto' ? 'default' : 'secondary'}>
                              {batch.generation_mode === 'auto' ? (
                                <><Sparkles className="w-3 h-3 mr-1" />Auto</>
                              ) : (
                                <><Wrench className="w-3 h-3 mr-1" />Manual</>
                              )}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(batch.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            <span>•</span>
                            <span>{batch.lists.length} lista(s)</span>
                          </CardDescription>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {batch.id !== 'legacy' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(batch);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lote?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação excluirá o lote "{batch.name}" e todas as suas {batch.lists.length} lista(s).
                                <br /><br />
                                <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteBatch.mutate(batch.id)}
                                className="bg-destructive"
                              >
                                Excluir Lote
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {batch.completed_buildings}/{batch.total_buildings} prédios ({progress}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {batch.lists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => navigate(`/lists/${list.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <FileStack className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{list.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
