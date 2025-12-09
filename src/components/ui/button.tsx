import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/utils/cn";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm shadow-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/70 disabled:pointer-events-none disabled:opacity-50",
  {
    // might want to make separate variants for "primaryOutline" and "primaryGhost" so you don't need the "!"
    variants: {
      variant: {
        default:
          "bg-primary !shadow-primaryButton text-primary-foreground hover:bg-primary/90 active:brightness-75",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover !shadow-primaryButton hover:text-secondary-foreground active:bg-secondary-active",
        outline:
          "border text-foreground hover:bg-secondary hover:!text-foreground active:bg-secondary-hover/70",
        ghost:
          "hover:bg-accent hover:!text-primary-foreground shadow-none active:brightness-90",
        link: "underline-offset-4 hover:underline active:brightness-75 shadow-none",
        text: "text-foreground shadow-none hover:text-foreground/80 active:text-foreground/60",
        audio:
          "bg-audio/85 border border-audio text-audio-foreground hover:bg-audio shadow-none active:brightness-75 disabled:bg-gray disabled:opacity-75 disabled:border-gray",
        destructive:
          "bg-destructive/75 border border-destructive text-destructive-foreground !shadow-primaryButton hover:bg-destructive active:brightness-75",
        modalClose:
          "baseFlex !size-5 absolute right-4 top-4 rounded-sm !p-0 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-foreground/70 disabled:pointer-events-none",
        toggleOn:
          "text-toggle-foreground hover:bg-secondary/20 active:bg-secondary/30",
        toggleOff:
          "text-toggle-background hover:bg-secondary/20 active:bg-secondary/30",
        theme: "border rounded-full hover:brightness-110 active:brightness-100",
        drawer:
          "w-full !rounded-none font-normal !h-[65px] last-of-type:border-b-none border-b border-gray/50 h-full baseFlex active:bg-secondary active:brightness-90 relative py-0",
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
        {...(variant === "audio" ? { "aria-label": "Play/Pause" } : {})}
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
