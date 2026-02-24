"use client";

import { HelpCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

/**
 * Optional help text or tooltip for form fields. Click the icon to toggle.
 * Use for non-technical users: e.g. "Slug = URL path, e.g. 'about' becomes /page/about"
 */
export function FieldHelp({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
        aria-label="Help"
        title={text}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-[100] min-w-[180px] max-w-[280px] max-h-[min(50vh,320px)] overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg"
          role="tooltip"
        >
          {text}
        </div>
      )}
    </div>
  );
}
