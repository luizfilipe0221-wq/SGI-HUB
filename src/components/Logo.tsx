export function Logo({ className = "" }: {className?: string;}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="font-bold text-2xl tracking-tight">
        <span className="text-foreground">Lista </span>
        <span className="text-primary"></span>
      </span>
    </div>);

}