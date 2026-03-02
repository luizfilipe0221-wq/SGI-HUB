import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-[rgba(0,0,0,0.04)] px-3.5 py-2.5 text-[15px] text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:bg-[rgba(255,255,255,0.9)] focus-visible:border-[rgba(0,122,255,0.4)] focus-visible:shadow-[0_0_0_3px_rgba(0,122,255,0.12)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
