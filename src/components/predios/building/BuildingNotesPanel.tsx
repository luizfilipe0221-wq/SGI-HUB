import { useState, useEffect } from 'react';
import { useCurrentBuildingNote, useSaveBuildingNote, useBuildingNotesHistory } from '@/hooks/predios/useBuildingNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronDown, Clock, Edit, Save, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BuildingNotesPanelProps {
  buildingId: string;
}

export function BuildingNotesPanel({ buildingId }: BuildingNotesPanelProps) {
  const { data: currentNote, isLoading } = useCurrentBuildingNote(buildingId);
  const { data: history } = useBuildingNotesHistory(buildingId);
  const saveNote = useSaveBuildingNote();
  
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content);
    }
  }, [currentNote]);

  const handleSave = async () => {
    if (!content.trim()) return;
    await saveNote.mutateAsync({ buildingId, content });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(currentNote?.content || '');
    setIsEditing(false);
  };

  if (isLoading) {
    return <Skeleton className="h-32 rounded-lg" />;
  }

  const hasNote = currentNote && currentNote.content.trim();

  return (
    <Card className={hasNote ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {hasNote && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            Observações do Prédio
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                if (!currentNote) setContent('');
              }}
            >
              <Edit className="w-4 h-4 mr-1" />
              {hasNote ? 'Editar' : 'Adicionar'}
            </Button>
          )}
        </div>
        {hasNote && !isEditing && (
          <CardDescription className="text-xs">
            Última atualização: {format(new Date(currentNote.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Apartamentos 101 e 205 vazios. Portaria não permite entrada após 18h. Interfone do 3º andar não funciona..."
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={saveNote.isPending || !content.trim()}
              >
                {saveNote.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        ) : hasNote ? (
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{currentNote.content}</p>
            
            {history && history.length > 1 && (
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Histórico ({history.length - 1})
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 pt-2 border-t">
                    {history.slice(1).map((note) => (
                      <div key={note.id} className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="pl-2 border-l-2 border-muted">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma observação registrada. Clique em "Adicionar" para incluir informações importantes sobre o prédio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
