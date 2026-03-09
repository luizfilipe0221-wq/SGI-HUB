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
        "bg-white border border-[#EEF2F7] rounded-[16px] p-4 transition-all duration-300",
        "shadow-[0_10px_30px_rgba(17,24,39,0.06)] flex flex-col justify-between h-full gap-2",
        isClickable && [
          "cursor-pointer",
          "hover:-translate-y-[2px] hover:shadow-[0_15px_35px_rgba(17,24,39,0.08)]",
          "active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        ]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] text-gray-400 font-medium tracking-wide uppercase">{title}</p>
          <p className={cn(
            "text-[26px] font-bold text-gray-900 leading-none",
            variant === 'expired' && "text-destructive",
            variant === 'warning' && "text-amber-500",
            variant === 'success' && "text-emerald-500"
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
