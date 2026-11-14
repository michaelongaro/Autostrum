import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "~/utils/cn";

const Accordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  StyledProps<typeof AccordionPrimitive.Root<string>>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
));
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  StyledProps<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={className} {...props} />
));
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps extends StyledProps<
  typeof AccordionPrimitive.Trigger
> {
  extraPadding?: boolean;
  showUnderline?: boolean;
  editingSectionContainer?: boolean;
  viewingSectionContainer?: boolean;
  forFAQ?: boolean;
  extraTabMetadata?: boolean;
  headingLevel?: 2 | 3;
}

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(
  (
    {
      extraPadding,
      showUnderline = true,
      editingSectionContainer,
      viewingSectionContainer,
      forFAQ,
      extraTabMetadata,
      headingLevel = 3,
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <AccordionPrimitive.Header
      render={headingLevel === 2 ? <h2 /> : <h3 />}
      className={`w-full ${
        editingSectionContainer || viewingSectionContainer ? "relative" : ""
      } flex`}
    >
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          `flex w-full flex-1 items-center justify-between ${
            extraPadding ? "py-2" : "py-0"
          } ${
            showUnderline ? "hover:underline" : ""
          } group/accordion-trigger rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/70`,
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={`${forFAQ ? "relative" : "absolute"} ${
            viewingSectionContainer
              ? "bottom-4 right-1"
              : editingSectionContainer
                ? "bottom-3 right-1"
                : extraTabMetadata
                  ? "right-4"
                  : "right-0"
          } size-5 shrink-0 rounded-md transition-all duration-200 group-data-[panel-open]/accordion-trigger:rotate-180`}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  ),
);
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps extends StyledProps<
  typeof AccordionPrimitive.Panel
> {
  extraPaddingBottom?: boolean;
  animated?: boolean;
}

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Panel>,
  AccordionContentProps
>(
  (
    { extraPaddingBottom, animated = true, className, children, ...props },
    ref,
  ) => (
    <AccordionPrimitive.Panel
      ref={ref}
      className={cn(
        // duration-* also sets animation-duration via tailwindcss-animate.
        // Keep this a height transition, including on initially open panels.
        `overflow-hidden ${
          animated
            ? "h-[var(--accordion-panel-height)] transition-[height] [transition-duration:200ms] data-[ending-style]:h-0 data-[starting-style]:h-0"
            : ""
        } `,
        className,
      )}
      {...props}
    >
      <div className={`${extraPaddingBottom ? "pb-4" : ""}`}>{children}</div>
    </AccordionPrimitive.Panel>
  ),
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
