"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { buttonVariants, type ButtonProps } from "./button";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { cn } from "~/utils/cn";

interface AnimatedToggleGroupProps<Value extends string> {
  value: Value;
  onValueChange: (value: Value) => void;
  options: readonly {
    value: Value;
    label: ReactNode;
    ariaLabel?: string;
    className?: string;
  }[];
  "aria-label": string;
  className?: string;
  itemClassName?: string;
  size?: ButtonProps["size"];
  disabled?: boolean;
  variant?: "default" | "accent" | "inverse";
  "data-search-layout-toggle"?: string;
}

export function AnimatedToggleGroup<Value extends string>({
  value,
  onValueChange,
  options,
  className,
  itemClassName,
  size,
  disabled = false,
  variant = "default",
  ...props
}: AnimatedToggleGroupProps<Value>) {
  const labelsRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);
  const resolvedSize = size ?? (aboveMediumViewportWidth ? "default" : "sm");

  useLayoutEffect(() => {
    const labels = labelsRef.current;
    const mask = maskRef.current;
    if (!labels || !mask) return;

    const updateMask = () => {
      const selected = labels.querySelector<HTMLElement>("[aria-pressed=true]");
      if (!selected || !labels.clientWidth) return;
      const left = selected.offsetLeft;
      const right = labels.clientWidth - left - selected.offsetWidth;
      mask.style.clipPath = `inset(0 ${right}px 0 ${left}px round 2px)`;
      mask.style.visibility = "visible";
    };

    updateMask();
    const observer = new ResizeObserver(updateMask);
    observer.observe(labels);
    for (const child of labels.children) observer.observe(child);
    return () => observer.disconnect();
  }, [value]);

  function itemClasses(optionClassName?: string) {
    return cn(
      buttonVariants({ variant: "toggle", size: resolvedSize }),
      "relative flex-1 gap-2 border-none",
      itemClassName,
      optionClassName,
    );
  }

  return (
    <ToggleGroup
      {...props}
      value={[value]}
      onValueChange={(values) => {
        if (values[0] !== undefined) onValueChange(values[0]);
      }}
      disabled={disabled}
      data-variant={variant}
      className={cn(
        "maskedToggle relative isolate shrink-0 overflow-hidden rounded-md border",
        className,
      )}
    >
      <div ref={labelsRef} className="relative flex" data-layout-labels="">
        {options.map((option) => (
          <Toggle
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={itemClasses(option.className)}
          >
            {option.label}
          </Toggle>
        ))}
      </div>
      {/* Only this presentation layer is clipped. Labels stay stationary as the
          highlight moves, so their color changes exactly at the mask edge. */}
      <div
        ref={maskRef}
        aria-hidden="true"
        inert
        data-layout-pill=""
        className="maskedToggleHighlight pointer-events-none absolute inset-0 flex"
        style={{ visibility: "hidden" }}
      >
        {options.map((option) => (
          <span
            key={option.value}
            className={cn(
              itemClasses(option.className),
              disabled && "opacity-50",
            )}
          >
            {option.label}
          </span>
        ))}
      </div>
    </ToggleGroup>
  );
}
