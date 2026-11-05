import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/utils/cn";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background outline outline-1 -outline-offset-1 outline-transparent transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,outline-color] hover:bg-background/70 hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground/70 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-secondary data-[pressed]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "outline-border hover:bg-secondary hover:text-foreground active:brightness-90",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive>,
  StyledProps<typeof TogglePrimitive> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
