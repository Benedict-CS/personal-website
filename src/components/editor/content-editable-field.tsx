"use client";

import { startTransition, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * contentEditable that does not re-render children from React on each keystroke,
 * so typing stays smooth while parent state updates.
 */
export function ContentEditableField({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  className: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    const el = ref.current;
    if (!el) return;
    if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      role="textbox"
      contentEditable
      suppressContentEditableWarning
      className={cn(
        "rounded-lg outline-none transition-shadow duration-150 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className,
      )}
      data-placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={(e) => {
        focused.current = false;
        onChange(e.currentTarget.textContent?.trim() || "");
      }}
      onInput={(e) => {
        const next = e.currentTarget.textContent ?? "";
        startTransition(() => onChange(next));
      }}
    />
  );
}
