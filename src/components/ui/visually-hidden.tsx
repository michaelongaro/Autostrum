import * as React from "react";
import { cn } from "~/utils/cn";

// Base UI has no VisuallyHidden primitive. Keep content available to screen readers.
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("sr-only", className)} {...props} />
));
VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
