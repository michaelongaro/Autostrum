import * as React from "react";

import { cn } from "~/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  showFocusState?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, invalid = false, showFocusState = true, type, ...props },
    ref,
  ) => {
    const focusClasses =
      showFocusState && !invalid
        ? "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70"
        : "";

    return (
      <input
        type={type}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        aria-invalid={invalid || undefined}
        className={cn(
          `ease-in-out flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-base ring-offset-background transition-[box-shadow] duration-200 file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-foreground/50 ${focusClasses} disabled:cursor-not-allowed disabled:opacity-50`,
          invalid && "ring-2 ring-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
