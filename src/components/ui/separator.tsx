"use client";

import type { StyledProps } from "./base-ui-types";

import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "~/utils/cn";

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive>,
  StyledProps<typeof SeparatorPrimitive>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SeparatorPrimitive
    ref={ref}
    orientation={orientation}
    className={cn(
      "shrink-0 rounded-full",
      orientation === "horizontal" ? "h-[2px] w-full" : "h-full w-[2px]",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
