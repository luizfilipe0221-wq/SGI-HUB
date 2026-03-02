import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'expired' | 'warning' | 'success';
  onClick?: () => void;
  href?: string;
}

export function StatsCard({ title, value, icon: Icon, variant = 'default', onClick, href }: StatsCardProps) {
  const navigate = useNavigate();
  
  const isClickable = !!onClick || !!href;
  
  const handleClick = () => {
    if (href) {
      navigate(href);
    } else if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${title}: ${value}. Clique para ver detalhes` : undefined}
      className={cn(
        "glass-card rounded-xl p-5 transition-all duration-200",
        isClickable && [
          "cursor-pointer",
          "hover:-translate-y-1 hover:shadow-lg",
          "active:translate-y-0 active:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        ]
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className={cn(
            "text-3xl font-bold mt-1",
            variant === 'expired' && "text-destructive",
            variant === 'warning' && "text-warning",
            variant === 'success' && "text-success"
          )}>
            {value}
          </p>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200",
          isClickable && "group-hover:scale-110",
          variant === 'default' && "bg-primary/10 text-primary",
          variant === 'expired' && "bg-destructive/10 text-destructive",
          variant === 'warning' && "bg-warning/10 text-warning",
          variant === 'success' && "bg-success/10 text-success"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
