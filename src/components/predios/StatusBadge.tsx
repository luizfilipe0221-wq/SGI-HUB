import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20';
      case 'pendente':
        return 'bg-red-500/10 text-red-600 hover:bg-red-500/20';
      case 'em_andamento':
        return 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20';
      case 'nao_iniciado':
      default:
        return 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    if (label) return label;
    switch (status) {
      case 'concluido': return 'Concluído';
      case 'pendente': return 'Com Pendência';
      case 'em_andamento': return 'Em Andamento';
      case 'nao_iniciado': return 'Não Iniciado';
      default: return status;
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border-0",
        getStatusColor(status),
        className
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
