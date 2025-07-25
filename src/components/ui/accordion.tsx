import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "~/utils/cn";

const Accordion = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>
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
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={className} {...props} />
));
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  extraPadding?: boolean;
  showUnderline?: boolean;
  editingSectionContainer?: boolean;
  viewingSectionContainer?: boolean;
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
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <AccordionPrimitive.Header
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
          } rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&[data-state=open]>svg]:rotate-180`,
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={`absolute ${
            viewingSectionContainer
              ? "bottom-4 right-1"
              : editingSectionContainer
                ? "bottom-3 right-1"
                : "right-4"
          } h-4 w-4 shrink-0 rounded-md transition-all duration-200 hover:bg-primary-foreground/20 active:hover:bg-primary-foreground/10`}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  ),
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

interface AccordionContentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  extraPaddingBottom?: boolean;
  animated?: boolean;
}

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(
  (
    { extraPaddingBottom, animated = true, className, children, ...props },
    ref,
  ) => (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        `overflow-hidden ${
          animated
            ? "transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
            : ""
        } `,
        className,
      )}
      {...props}
    >
      <div className={`${extraPaddingBottom ? "pb-4" : ""}`}>{children}</div>
    </AccordionPrimitive.Content>
  ),
);
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
