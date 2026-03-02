import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-foreground/90 hover:-translate-y-[0.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
        destructive: "bg-[rgba(255,59,48,0.08)] text-destructive border border-[rgba(255,59,48,0.15)] hover:bg-[rgba(255,59,48,0.12)]",
        outline: "border border-input bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.08)] text-foreground",
        secondary: "bg-[rgba(0,0,0,0.05)] text-foreground border border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.08)]",
        ghost: "hover:bg-[rgba(0,0,0,0.05)] text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
