"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { NavItem } from "@/types/site";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableNavRow({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: NavItem;
  index: number;
  onUpdate: (index: number, field: "label" | "href", value: string) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `nav-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 flex-wrap ${isDragging ? "z-20 opacity-95 shadow-lg rounded-md bg-white border border-slate-200" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none p-1 text-slate-400 hover:text-slate-600 rounded"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        placeholder="Label (e.g. Home)"
        value={item.label}
        onChange={(e) => onUpdate(index, "label", e.target.value)}
        className="w-28"
        title="Text shown in the menu"
      />
      <Input
        placeholder="/path (e.g. /about)"
        value={item.href}
        onChange={(e) => onUpdate(index, "href", e.target.value)}
        className="flex-1 min-w-[120px]"
        title="Link URL. Start with / for pages on your site (e.g. /blog, /contact)."
      />
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 shrink-0" onClick={() => onRemove(index)} title="Remove this link">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Editable list of nav items with drag-and-drop reorder. For use in Setup wizard and Site settings.
 */
export function NavItemsEditor({
  items,
  onChange,
  addLabel = "Add link",
  helpText,
}: {
  items: NavItem[];
  onChange: (items: NavItem[]) => void;
  addLabel?: string;
  helpText?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateOne = (index: number, field: "label" | "href", value: string) => {
    onChange(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };
  const removeOne = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const addOne = () => {
    onChange([...items, { label: "New", href: "/" }]);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((_, i) => `nav-${i}` === active.id);
      const newIndex = items.findIndex((_, i) => `nav-${i}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  return (
    <div className="space-y-3">
      {helpText && <p className="text-sm text-slate-600">{helpText}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((_, i) => `nav-${i}`)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableNavRow
                key={`nav-${index}`}
                item={item}
                index={index}
                onUpdate={updateOne}
                onRemove={removeOne}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button type="button" variant="outline" size="sm" onClick={addOne} className="gap-1">
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
