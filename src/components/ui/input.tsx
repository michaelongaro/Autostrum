import * as React from "react";
import { useState, useEffect } from "react";

import { cn } from "~/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showingErrorShakeAnimation?: boolean;
  smallErrorShakeAnimation?: boolean;
  showFocusState?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      showingErrorShakeAnimation,
      smallErrorShakeAnimation,
      showFocusState = true,
      type,
      ...props
    },
    ref,
  ) => {
    // needed since once flag for errorShake turns off, it immediately reverts back to "transition-all",
    // and results in a lop-sided animation
    const [extraTimeoutForShakeAnimation, setExtraTimeoutForShakeAnimation] =
      useState(false);

    useEffect(() => {
      if (showingErrorShakeAnimation) {
        setExtraTimeoutForShakeAnimation(true);

        setTimeout(() => {
          setExtraTimeoutForShakeAnimation(false);
        }, 1000);
      }
    }, [showingErrorShakeAnimation]);

    const focusClasses = showFocusState
      ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
      : "";

    return (
      <input
        type={type}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        style={{
          ...(showingErrorShakeAnimation
            ? {
                boxShadow: "0 0 0 0.25rem hsl(var(--destructive))",
                transitionProperty: "box-shadow",
                transitionDuration: "500ms",
                transitionTimingFunction: "ease-in-out",
              }
            : {
                transitionProperty: "box-shadow",
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
              }),
          transitionDuration:
            showingErrorShakeAnimation || extraTimeoutForShakeAnimation
              ? "500ms"
              : "150ms",
        }}
        className={cn(
          `flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-base ring-offset-background ${
            showingErrorShakeAnimation
              ? smallErrorShakeAnimation
                ? "animate-smallErrorShake"
                : "animate-errorShake"
              : "transition-all"
          } file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-foreground/50 ${focusClasses} disabled:cursor-not-allowed disabled:opacity-50`,
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
