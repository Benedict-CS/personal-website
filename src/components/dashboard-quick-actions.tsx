"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Sparkles,
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
const USAGE_STORAGE_KEY = "dashboard-quick-actions-usage-v1";
const LAST_USED_STORAGE_KEY = "dashboard-quick-actions-last-used-v1";
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
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
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
      try {
        const storedUsage = localStorage.getItem(USAGE_STORAGE_KEY);
        const parsedUsage = storedUsage ? (JSON.parse(storedUsage) as Record<string, number>) : {};
        const normalizedUsage = Object.fromEntries(
          Object.entries(parsedUsage).filter(
            ([id, value]) => QUICK_ACTIONS.some((action) => action.id === id) && Number.isFinite(Number(value))
          )
        ) as Record<string, number>;
        setUsageCounts(normalizedUsage);
      } catch {
        setUsageCounts({});
      }
      try {
        const storedLastUsed = localStorage.getItem(LAST_USED_STORAGE_KEY);
        const parsedLastUsed = storedLastUsed ? (JSON.parse(storedLastUsed) as Record<string, string>) : {};
        const normalizedLastUsed = Object.fromEntries(
          Object.entries(parsedLastUsed).filter(
            ([id, value]) => QUICK_ACTIONS.some((action) => action.id === id) && typeof value === "string"
          )
        ) as Record<string, string>;
        setLastUsedMap(normalizedLastUsed);
      } catch {
        setLastUsedMap({});
      }
    });
    return () => cancelAnimationFrame(raf);
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

  useEffect(() => {
    try {
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageCounts));
    } catch {
      // Ignore storage write failures.
    }
  }, [usageCounts]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(lastUsedMap));
    } catch {
      // Ignore storage write failures.
    }
  }, [lastUsedMap]);

  const orderedActions = useMemo(() => {
    const map = new Map(QUICK_ACTIONS.map((action) => [action.id, action]));
    return normalizeOrder(order)
      .map((id) => map.get(id))
      .filter((action): action is QuickAction => Boolean(action));
  }, [order]);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const pinnedActions = orderedActions.filter((action) => pinnedSet.has(action.id));

  const smartOrderIds = useMemo(() => {
    const indexMap = new Map(order.map((id, idx) => [id, idx]));
    return [...orderedActions]
      .sort((a, b) => {
        const usageDelta = (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0);
        if (usageDelta !== 0) return usageDelta;
        return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
      })
      .map((action) => action.id);
  }, [order, orderedActions, usageCounts]);

  const topUsedActions = useMemo(
    () =>
      [...orderedActions]
        .filter((action) => (usageCounts[action.id] ?? 0) > 0)
        .sort((a, b) => (usageCounts[b.id] ?? 0) - (usageCounts[a.id] ?? 0))
        .slice(0, 3),
    [orderedActions, usageCounts]
  );

  const hasUsageData = topUsedActions.length > 0;
  const smartOrderChanged = smartOrderIds.some((id, idx) => id !== order[idx]);

  const recordUsage = useCallback((id: string) => {
    const nowIso = new Date().toISOString();
    setUsageCounts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
    setLastUsedMap((prev) => ({
      ...prev,
      [id]: nowIso,
    }));
  }, []);

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
      recordUsage(targetAction.id);
      router.push(targetAction.href);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [orderedActions, pathname, recordUsage, router]);

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
    setUsageCounts({});
    setLastUsedMap({});
    try {
      localStorage.removeItem(ORDER_STORAGE_KEY);
      localStorage.removeItem(PINNED_STORAGE_KEY);
      localStorage.removeItem(USAGE_STORAGE_KEY);
      localStorage.removeItem(LAST_USED_STORAGE_KEY);
    } catch {
      // Ignore storage write failures.
    }
  };

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const formatLastUsed = (iso: string | undefined, currentMs: number) => {
    if (!iso) return "Never";
    const ts = new Date(iso).getTime();
    if (Number.isNaN(ts)) return "Never";
    const diffMs = currentMs - ts;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const applySmartOrder = () => {
    setOrder(smartOrderIds);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={applySmartOrder}
              disabled={!hasUsageData || !smartOrderChanged}
              title="Sort actions by usage frequency"
            >
              <Sparkles className="h-4 w-4" />
              Smart order
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetPreferences}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Pin frequent actions and reorder shortcuts for your workflow.
        </p>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Keyboard: use Alt+1..9 to open the corresponding action.
        </p>
        {hasUsageData ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Top used:{" "}
            {topUsedActions.map((action) => `${action.label} (${usageCounts[action.id] ?? 0})`).join(" · ")}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {pinnedActions.length > 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2">
            <p className="text-xs font-medium text-[var(--foreground)]">Pinned</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pinnedActions.map((action) => (
                <Link
                  key={`pinned-${action.id}`}
                  href={action.href}
                  onClick={() => recordUsage(action.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]/60 transition-colors duration-150"
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
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 transition-colors duration-150 hover:border-[oklch(0.91_0.012_255)]"
            >
              <Link href={action.href} onClick={() => recordUsage(action.id)} className="flex min-w-0 flex-1 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {action.label}{" "}
                    <span className="rounded border border-[var(--border)] px-1 py-0 text-[10px] font-normal text-[var(--muted-foreground)]">
                      Alt+{index + 1}
                    </span>
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {action.hint} · Last used {formatLastUsed(lastUsedMap[action.id], nowMs)}
                  </p>
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
