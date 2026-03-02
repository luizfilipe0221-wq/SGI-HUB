import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'expired' | 'warning' | 'success' | 'completed' | 'not_started';
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        status === 'expired' && "status-expired",
        status === 'warning' && "status-warning",
        status === 'success' && "status-success",
        status === 'completed' && "status-completed",
        status === 'not_started' && "status-not-started",
        className
      )}
    >
      {label}
    </span>
  );
}
