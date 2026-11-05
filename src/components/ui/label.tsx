"use client";

import type { StyledProps } from "./base-ui-types";

import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "~/utils/cn";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-70",
);

const Label = React.forwardRef<
  React.ComponentRef<"label">,
  StyledProps<"label"> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = "Label";

export { Label };
