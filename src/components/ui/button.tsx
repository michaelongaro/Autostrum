import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/lib/utils";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:ring-0 active:ring-offset-0 active:ring-offset-background~",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:brightness-75",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 active:bg-destructive active:brightness-75",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground active:bg-accent/60",
        secondary:
          "lightGlassmorphic text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/60 border-2",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/60",
        link: "underline-offset-4 hover:underline text-primary",
        toggledOn:
          "bg-primary text-primary-foreground hover:bg-primary/80 active:bg-primary/60 border-2",
        toggledOff:
          "text-primary-foreground hover:bg-secondary/20 active:bg-secondary/30 border-2",
        navigation:
          "bg-pink-200 hover:bg-pink-900 text-pink-900 hover:text-pink-200 active:bg-pink-950/90",
        playPause:
          "bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-90 disabled:bg-zinc-600",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

    return (
      <button
        className={cn(
          buttonVariants({
            variant,
            size: size ?? (aboveMediumViewportWidth ? "default" : "sm"),
            className,
          })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
