import { useBuildingChangeHistory, getFieldLabel } from '@/hooks/predios/useBuildingChangeHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { History, FileEdit, FileUp, CheckSquare, Import } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BuildingChangeHistoryTabProps {
  buildingId: string;
}

const SOURCE_CONFIG = {
  manual: { label: 'Manual', icon: FileEdit, color: 'bg-blue-500/10 text-blue-600' },
  extraction: { label: 'Extração', icon: FileUp, color: 'bg-orange-500/10 text-orange-600' },
  review: { label: 'Revisão', icon: CheckSquare, color: 'bg-green-500/10 text-green-600' },
  import: { label: 'Importação', icon: Import, color: 'bg-purple-500/10 text-purple-600' },
};

export function BuildingChangeHistoryTab({ buildingId }: BuildingChangeHistoryTabProps) {
  const { data: history, isLoading } = useBuildingChangeHistory(buildingId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <History className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        <p className="text-sm text-muted-foreground mt-1">
          As alterações nos campos do prédio aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="divide-y">
        {history.map((record) => {
          const sourceConfig = SOURCE_CONFIG[record.change_source as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.manual;
          const SourceIcon = sourceConfig.icon;

          return (
            <div key={record.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <SourceIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {getFieldLabel(record.field_name)}
                      </span>
                      <Badge variant="outline" className={sourceConfig.color}>
                        {sourceConfig.label}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm">
                      {record.old_value ? (
                        <>
                          <span className="text-muted-foreground line-through">
                            {record.old_value}
                          </span>
                          <span className="mx-2 text-muted-foreground">→</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground mr-2">(vazio) →</span>
                      )}
                      <span className="text-foreground font-medium">
                        {record.new_value || '(vazio)'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
