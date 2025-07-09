import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/utils/cn";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm shadow-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary !shadow-primaryButton text-primary-foreground hover:bg-primary/90 active:brightness-75",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover !shadow-primaryButton hover:text-secondary-foreground active:bg-secondary-active",
        outline:
          "border text-background hover:bg-background hover:text-foreground active:bg-background/60",
        ghost:
          "hover:bg-toggleOn hover:text-foreground shadow-none active:bg-toggleOn/60",
        link: "underline-offset-4 hover:underline shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground !shadow-primaryButton hover:bg-destructive/80 active:bg-destructive active:brightness-75",
        toggledOn:
          "bg-primary text-primary-foreground hover:bg-primary/80 active:bg-primary/60 border-2",
        toggledOff:
          "text-primary-foreground hover:bg-secondary/20 active:bg-secondary/30 border-2",
        navigation:
          "bg-pink-200 hover:bg-pink-700 text-pink-800 !shadow-primaryButton hover:text-pink-200 active:bg-pink-800 active:text-pink-200",
        playPause:
          "bg-green-600 text-primary-foreground hover:bg-green-700 shadow-none active:bg-green-800 disabled:opacity-50 disabled:bg-gray-500",
        text: "text-foreground shadow-none hover:text-foreground/80 active:text-foreground/60",
        drawer:
          "w-full !rounded-none font-normal !h-[65px] last-of-type:border-b-none border-b border-stone-400 h-full baseFlex bg-pink-100 active:brightness-75 relative py-0",
        drawerNavigation:
          "text-primary shadow-none hover:text-primary/80 active:text-primary/60",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
    const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

    return (
      <Comp
        {...(variant === "playPause" ? { "aria-label": "Play/Pause" } : {})}
        className={cn(
          buttonVariants({
            variant,
            size: size ?? (aboveMediumViewportWidth ? "default" : "sm"),
            className,
          }),
        )}
        ref={ref}
        {...props}
        style={{
          ...props.style,
          transition:
            "opacity 0.15s linear, transform 0.15s linear, filter 0.15s linear, background-color 0.15s linear, color 0.15s linear",
        }}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
