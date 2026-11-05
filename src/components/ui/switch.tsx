import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Switch as SwitchPrimitives } from "@base-ui/react/switch";

import { cn } from "~/utils/cn";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  StyledProps<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "data-[unchecked]:bg-input peer inline-flex h-[24px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border bg-secondary-active shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70 focus-visible:ring-offset-background data-[disabled]:cursor-not-allowed data-[checked]:bg-primary data-[disabled]:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-primary-foreground shadow-lg ring-0 transition-transform data-[checked]:translate-x-[26px] data-[unchecked]:translate-x-[2px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = "Switch";

export { Switch };
