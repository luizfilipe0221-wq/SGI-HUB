import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUndoActions } from '@/hooks/predios/useUndoActions';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function UndoButton({ className, showLabel = true }: UndoButtonProps) {
  const { canUndo, performUndo, isUndoing, lastAction, undoStackSize } = useUndoActions();

  if (!canUndo) return null;

  const getActionLabel = () => {
    if (!lastAction) return 'Desfazer';
    
    const labels: Record<string, string> = {
      MARK_APARTMENT: 'marcar apartamento',
      UNMARK_APARTMENT: 'desmarcar apartamento',
      CREATE_SESSION: 'criar sessão',
      COMPLETE_SESSION: 'concluir sessão',
      CANCEL_SESSION: 'cancelar sessão',
    };

    return `Desfazer: ${labels[lastAction.action_type] || lastAction.action_type}`;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => performUndo()}
      disabled={isUndoing}
      className={cn("gap-2", className)}
      title={getActionLabel()}
    >
      <Undo2 className="w-4 h-4" />
      {showLabel && (
        <span className="hidden sm:inline">
          Desfazer {undoStackSize > 1 && `(${undoStackSize})`}
        </span>
      )}
    </Button>
  );
}
