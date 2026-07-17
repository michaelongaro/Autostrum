import * as React from "react";

import { cn } from "~/utils/cn";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "border-input flex h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base ring-offset-background transition placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
