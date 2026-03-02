import { Link } from 'react-router-dom';
import { useListItemNavigation } from '@/hooks/predios/useListExecution';
import { useGeneratedLists } from '@/hooks/predios/useGeneratedLists';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronLeft, ChevronRight, FileStack, CheckCircle2 } from 'lucide-react';

interface ListExecutionBannerProps {
  listId: string;
  listItemId: string;
  buildingId: string;
  onNavigate?: (buildingId: string, listItemId: string) => void;
}

export function ListExecutionBanner({ listId, listItemId, buildingId, onNavigate }: ListExecutionBannerProps) {
  const { data: lists } = useGeneratedLists();
  const navigation = useListItemNavigation(listId, listItemId);
  
  const list = lists?.find(l => l.id === listId);
  const { prev, next, current, total, position } = navigation;

  if (!list) return null;

  const handleNavigate = (item: typeof prev) => {
    if (item && onNavigate) {
      onNavigate(item.building_id, item.id);
    }
  };

  const progressPercent = current 
    ? Math.round((current.completed_letters_count / current.letters_planned) * 100)
    : 0;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileStack className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Executando:</span>
              <span className="font-medium">{list.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">
                Prédio {position} de {total}
              </Badge>
              {current && (
                <Badge 
                  variant={current.is_completed ? 'default' : 'outline'} 
                  className={`text-xs ${current.is_completed ? 'bg-green-500' : ''}`}
                >
                  {current.is_completed ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Concluído
                    </>
                  ) : (
                    `${current.completed_letters_count}/${current.letters_planned} cartas`
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous Building */}
          <Button
            variant="outline"
            size="sm"
            disabled={!prev}
            onClick={() => handleNavigate(prev)}
            className="hidden sm:flex"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          {/* Next Building */}
          <Button
            variant="outline"
            size="sm"
            disabled={!next}
            onClick={() => handleNavigate(next)}
            className="hidden sm:flex"
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={!prev}
              onClick={() => handleNavigate(prev)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!next}
              onClick={() => handleNavigate(next)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Back to List */}
          <Button variant="default" size="sm" asChild>
            <Link to={`/lists/${listId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {current && !current.is_completed && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso neste prédio</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
