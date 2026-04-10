"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_MODAL_PANEL_BASE,
  DASHBOARD_OVERLAY_SCRIM,
} from "@/components/dashboard/dashboard-overlay-classes";

const SHORTCUT_GROUPS: { title: string; rows: { keys: string; label: string }[] }[] = [
  {
    title: "Global",
    rows: [
      { keys: "⌘ K  ·  Ctrl+K", label: "Open command palette" },
      { keys: "⌘ /  ·  Ctrl+/  ·  ?", label: "Toggle keyboard shortcuts" },
      { keys: "Esc", label: "Close dialogs and menus" },
    ],
  },
  {
    title: "Command palette",
    rows: [
      { keys: "↑ ↓", label: "Move selection" },
      { keys: "↵", label: "Open selected item" },
    ],
  },
  {
    title: "Post editor",
    rows: [
      { keys: "⌘ S  ·  Ctrl+S", label: "Save post" },
      { keys: "⌘ ↵  ·  Ctrl+Enter", label: "Publish (save with publish intent)" },
    ],
  },
  {
    title: "Media library",
    rows: [
      { keys: "← ↑ → ↓", label: "Move focus across items (grid focused)" },
      { keys: "Home / End", label: "Jump to first or last visible item" },
      { keys: "↵", label: "Copy URL of focused item" },
    ],
  },
  {
    title: "Audit log",
    rows: [
      { keys: "⌘ K", label: "Type “audit” in the command palette to open the audit page" },
      { keys: "Bookmark", label: "Pin important rows (stored in this browser only)" },
    ],
  },
  {
    title: "Visual editor (markdown)",
    rows: [
      { keys: "⌘ Z  ·  Ctrl+Z", label: "Undo in the markdown field" },
      { keys: "⌘ ⇧ Z  ·  Ctrl+Shift+Z", label: "Redo in the markdown field" },
      { keys: "/  at line start", label: "Open slash menu to insert blocks" },
    ],
  },
  {
    title: "Visual page builder (blocks)",
    rows: [
      {
        keys: "⌘ Z  ·  Ctrl+Z",
        label: "Undo block, theme, or brand changes when focus is outside inputs and text areas",
      },
      { keys: "⌘ ⇧ Z  ·  Ctrl+Shift+Z", label: "Redo builder changes" },
      {
        keys: "Grip ⋮⋮",
        label: "Focus the block drag handle, then use arrow keys to reorder sections (dnd-kit keyboard sorting)",
      },
    ],
  },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[role="textbox"]')) return true;
  return false;
}

export function DashboardKeyboardHelp() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }

      const slashChord =
        (e.key === "/" || e.code === "Slash") && (e.metaKey || e.ctrlKey) && !e.altKey;
      const questionToggle = e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey;

      if (!slashChord && !questionToggle) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const onPanelKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    };

    const node = panelRef.current;
    node?.addEventListener("keydown", onPanelKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      node?.removeEventListener("keydown", onPanelKeyDown);
      previousFocused?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
          className={`fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-[4px] ${DASHBOARD_OVERLAY_SCRIM}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keyboard-help-title"
          aria-describedby="keyboard-help-description"
          onClick={close}
        >
          <motion.div
            ref={panelRef}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 4 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 30, mass: 0.8 }
            }
            className={`max-h-[min(85vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl ${DASHBOARD_MODAL_PANEL_BASE}`}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/50">
                  <Keyboard className="h-4 w-4 text-foreground" aria-hidden />
                </span>
                <div>
                  <h2 id="keyboard-help-title" className="text-base font-semibold tracking-tight text-foreground">
                    Keyboard shortcuts
                  </h2>
                  <p id="keyboard-help-description" className="text-xs text-muted-foreground">
                    Press <kbd className="rounded border border-border bg-muted/40 px-1 py-0.5 font-mono text-[10px]">?</kbd>{" "}
                    or <kbd className="rounded border border-border bg-muted/40 px-1 py-0.5 font-mono text-[10px]">⌘/</kbd>{" "}
                    (Ctrl+/ on Windows) outside a text field.
                  </p>
                </div>
              </div>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={close}
                aria-label="Close keyboard shortcuts"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[min(65vh,520px)] overflow-y-auto px-5 py-4">
              <div className="space-y-6">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {group.title}
                    </p>
                    <ul className="space-y-2">
                      {group.rows.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5 text-sm"
                        >
                          <span className="text-foreground">{row.label}</span>
                          <kbd className="shrink-0 rounded-lg border border-border bg-card px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground shadow-[var(--elevation-1)]">
                            {row.keys}
                          </kbd>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
