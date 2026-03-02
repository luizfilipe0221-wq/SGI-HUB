import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-[rgba(0,0,0,0.06)]", className)} {...props} />;
}

export { Skeleton };
