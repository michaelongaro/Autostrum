import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "~/utils/utils";

const Accordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
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
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={className} {...props} />
));
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  extraPadding?: boolean;
  showUnderline?: boolean;
  chevronExtraMarginRight?: boolean;
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(
  (
    {
      extraPadding,
      showUnderline = true,
      chevronExtraMarginRight,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          `flex flex-1 items-center justify-between ${
            extraPadding ? "py-2" : "py-0"
          } ${
            showUnderline ? "hover:underline" : ""
          } font-medium transition-all [&[data-state=open]>svg]:rotate-180`,
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className={`absolute ${
            chevronExtraMarginRight ? "right-8" : "right-4"
          } h-4 w-4 shrink-0 transition-transform duration-200`}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

interface AccordionContentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  extraPaddingBottom?: boolean;
  animated?: boolean;
}

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  AccordionContentProps
>(
  (
    { extraPaddingBottom, animated = true, className, children, ...props },
    ref
  ) => (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        `overflow-hidden
      ${
        animated
          ? "transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
          : ""
      }
      `,
        className
      )}
      {...props}
    >
      <div className={`${extraPaddingBottom ? "pb-4" : ""}`}>{children}</div>
    </AccordionPrimitive.Content>
  )
);
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
