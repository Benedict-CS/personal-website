"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  FilePlus2,
  FileText,
  Pin,
  RotateCcw,
  ShieldCheck,
  Clock3,
  type LucideIcon,
} from "lucide-react";

type QuickAction = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  hint: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-post",
    label: "New post",
    href: "/dashboard/posts/new",
    icon: FilePlus2,
    hint: "Create and publish a new article",
  },
  {
    id: "site-settings",
    label: "Site settings",
    href: "/dashboard/content/site",
    icon: ShieldCheck,
    hint: "Brand, nav, footer, and SEO defaults",
  },
  {
    id: "custom-pages",
    label: "Custom pages",
    href: "/dashboard/content/pages",
    icon: FileText,
    hint: "Manage page content, schedule, and preview",
  },
  {
    id: "media",
    label: "Media manager",
    href: "/dashboard/media",
    icon: Eye,
    hint: "Upload, clean up, and optimize assets",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: Clock3,
    hint: "Traffic and behavior overview",
  },
];

const ORDER_STORAGE_KEY = "dashboard-quick-actions-order-v1";
const PINNED_STORAGE_KEY = "dashboard-quick-actions-pinned-v1";
const DEFAULT_PINNED = ["new-post", "custom-pages", "media"];

function normalizeOrder(order: string[] | null): string[] {
  const ids = QUICK_ACTIONS.map((action) => action.id);
  if (!order || order.length === 0) return ids;
  const deduped = order.filter((id, idx) => ids.includes(id) && order.indexOf(id) === idx);
  const missing = ids.filter((id) => !deduped.includes(id));
  return [...deduped, ...missing];
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export function DashboardQuickActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [order, setOrder] = useState<string[]>(() => QUICK_ACTIONS.map((action) => action.id));
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED);

  useEffect(() => {
    try {
      const storedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
      const parsedOrder = storedOrder ? (JSON.parse(storedOrder) as string[]) : null;
      setOrder(normalizeOrder(Array.isArray(parsedOrder) ? parsedOrder : null));
    } catch {
      setOrder(normalizeOrder(null));
    }
    try {
      const storedPinned = localStorage.getItem(PINNED_STORAGE_KEY);
      const parsedPinned = storedPinned ? (JSON.parse(storedPinned) as string[]) : [];
      const validPinned = Array.isArray(parsedPinned)
        ? parsedPinned.filter((id, idx) => QUICK_ACTIONS.some((action) => action.id === id) && parsedPinned.indexOf(id) === idx)
        : [];
      setPinnedIds(validPinned.length > 0 ? validPinned : DEFAULT_PINNED);
    } catch {
      setPinnedIds(DEFAULT_PINNED);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Ignore storage write failures.
    }
  }, [order]);

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Ignore storage write failures.
    }
  }, [pinnedIds]);

  const orderedActions = useMemo(() => {
    const map = new Map(QUICK_ACTIONS.map((action) => [action.id, action]));
    return normalizeOrder(order)
      .map((id) => map.get(id))
      .filter((action): action is QuickAction => Boolean(action));
  }, [order]);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const pinnedActions = orderedActions.filter((action) => pinnedSet.has(action.id));

  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;
      const pressed = Number(event.key);
      if (!Number.isInteger(pressed) || pressed < 1 || pressed > 9) return;
      const targetAction = orderedActions[pressed - 1];
      if (!targetAction) return;
      event.preventDefault();
      router.push(targetAction.href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedActions, pathname, router]);

  const moveAction = (id: string, direction: "up" | "down") => {
    setOrder((prev) => {
      const next = normalizeOrder(prev);
      const index = next.indexOf(id);
      if (index === -1) return next;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return next;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return [...next];
    });
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const resetPreferences = () => {
    setOrder(QUICK_ACTIONS.map((action) => action.id));
    setPinnedIds(DEFAULT_PINNED);
    try {
      localStorage.removeItem(ORDER_STORAGE_KEY);
      localStorage.removeItem(PINNED_STORAGE_KEY);
    } catch {
      // Ignore storage write failures.
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetPreferences}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Pin frequent actions and reorder shortcuts for your workflow.
        </p>
        <p className="text-[11px] text-slate-400">
          Keyboard: use Alt+1..9 to open the corresponding action.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {pinnedActions.length > 0 ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">Pinned</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pinnedActions.map((action) => (
                <Link
                  key={`pinned-${action.id}`}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {orderedActions.map((action, index) => {
          const Icon = action.icon;
          const isPinned = pinnedSet.has(action.id);
          return (
            <div
              key={action.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2"
            >
              <Link href={action.href} className="flex min-w-0 flex-1 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {action.label}{" "}
                    <span className="rounded border border-slate-300 px-1 py-0 text-[10px] font-normal text-slate-500">
                      Alt+{index + 1}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-500">{action.hint}</p>
                </div>
              </Link>
              <Button
                type="button"
                size="icon"
                variant={isPinned ? "default" : "outline"}
                className="h-7 w-7"
                onClick={() => togglePin(action.id)}
                title={isPinned ? "Unpin action" : "Pin action"}
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => moveAction(action.id, "up")}
                disabled={index === 0}
                title="Move up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => moveAction(action.id, "down")}
                disabled={index === orderedActions.length - 1}
                title="Move down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
