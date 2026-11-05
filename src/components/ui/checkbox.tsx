import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "~/utils/cn";

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  StyledProps<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-primary ring-offset-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70 data-[disabled]:cursor-not-allowed data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="size-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
