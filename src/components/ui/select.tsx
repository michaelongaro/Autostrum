import type { StyledProps } from "./base-ui-types";
import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "~/utils/cn";
import { Separator } from "~/components/ui/separator";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

function Select<Value, Multiple extends boolean | undefined = false>({
  children,
  items,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  // Radix copied ItemText into Value automatically. Supply the same labels to
  // Base UI, including before a lazy popup mounts and during server rendering.
  const labels: { value: Value; label: React.ReactNode }[] = [];
  function collectItems(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (
        !React.isValidElement<{ value: Value; children?: React.ReactNode }>(
          child,
        )
      )
        return;
      if (child.type === SelectItem) {
        labels.push({ value: child.props.value, label: child.props.children });
      } else {
        collectItems(child.props.children);
      }
    });
  }
  if (!items) collectItems(children);
  return (
    <SelectPrimitive.Root {...props} items={items ?? labels}>
      {children}
    </SelectPrimitive.Root>
  );
}

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps extends StyledProps<
  typeof SelectPrimitive.Trigger
> {
  invalid?: boolean;
}

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, invalid, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    style={{
      transitionProperty: "box-shadow",
      transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      transitionDuration: "150ms",
    }}
    className={cn(
      "border-input flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-transparent py-2 pl-3 pr-2 text-sm ring-offset-background placeholder:text-foreground/75 focus:outline-none focus:ring-1 focus:ring-foreground/70 disabled:cursor-not-allowed disabled:opacity-50",
      invalid && "ring-2 ring-destructive",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="shrink-0">
      <ChevronDown className="size-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Popup>,
  StyledProps<typeof SelectPrimitive.Popup> &
    Pick<
      SelectPrimitive.Positioner.Props,
      | "align"
      | "alignOffset"
      | "side"
      | "sideOffset"
      | "alignItemWithTrigger"
      | "collisionPadding"
    >
>(
  (
    {
      className,
      children,
      align = "start",
      alignOffset = 0,
      side = "bottom",
      sideOffset = 4,
      alignItemWithTrigger = false,
      collisionPadding = 8,
      ...props
    },
    ref,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          ref={ref}
          className={cn(
            "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-background text-foreground shadow-md transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            "max-h-[var(--available-height)] w-max min-w-[max(8rem,var(--anchor-width))] max-w-[var(--available-width)]",
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List className={cn("p-1", "w-full")}>
            <OverlayScrollbarsComponent
              options={{
                scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                overflow: {
                  x: "hidden",
                  y: "scroll",
                },
              }}
              defer
              className="max-h-[300px] w-full"
            >
              {children}
            </OverlayScrollbarsComponent>
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.GroupLabel>,
  StyledProps<typeof SelectPrimitive.GroupLabel>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.GroupLabel
    ref={ref}
    className={cn("ml-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  >
    {props.children}
    <Separator className="-ml-2 mt-1 h-[1px] w-full bg-primary" />
  </SelectPrimitive.GroupLabel>
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  StyledProps<typeof SelectPrimitive.Item> & {
    indicator?: React.ReactNode;
  }
>(({ className, children, indicator, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText className="min-w-0 flex-1">
      {children}
    </SelectPrimitive.ItemText>
    {indicator !== null && (
      <span className="ml-auto flex size-4 shrink-0 items-center justify-center">
        {indicator !== undefined ? (
          indicator
        ) : (
          <SelectPrimitive.ItemIndicator>
            <Check className="h-4 w-4" />
          </SelectPrimitive.ItemIndicator>
        )}
      </span>
    )}
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  StyledProps<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-primary", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
