import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/utils/cn";

interface SortableMetadataListProps<T extends { id: string }> {
  items: T[];
  reordering: boolean;
  onReorder: (items: T[]) => void;
  onDragStart: () => void;
  className?: string;
  itemClassName?: string;
  handleClassName?: string;
  getItemLabel: (item: T, index: number) => string;
  children: (item: T, index: number, handle: ReactNode) => ReactNode;
}

function SortableMetadataList<T extends { id: string }>({
  items,
  reordering,
  onReorder,
  onDragStart,
  className,
  itemClassName,
  handleClassName,
  getItemLabel,
  children,
}: SortableMetadataListProps<T>) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!reordering || !over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;

    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items}
        strategy={rectSortingStrategy}
        disabled={!reordering}
      >
        <div className={className}>
          {items.map((item, index) => (
            <SortableMetadataItem
              key={item.id}
              id={item.id}
              reordering={reordering}
              label={getItemLabel(item, index)}
              className={itemClassName}
              handleClassName={handleClassName}
            >
              {(handle) => children(item, index, handle)}
            </SortableMetadataItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableMetadataItem({
  id,
  reordering,
  label,
  className,
  handleClassName,
  children,
}: {
  id: string;
  reordering: boolean;
  label: string;
  className?: string;
  handleClassName?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !reordering });

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("relative shrink-0", className)}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      {children(
        reordering ? (
          <Button
            ref={setActivatorNodeRef}
            type="button"
            variant="ghost"
            size="sm"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className={cn(
              "cursor-grab touch-none rounded-none active:cursor-grabbing",
              handleClassName,
            )}
          >
            <GripVertical className="size-5" />
          </Button>
        ) : null,
      )}
    </motion.div>
  );
}

export default SortableMetadataList;
