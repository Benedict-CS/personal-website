"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ActivityEntry = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
};

type ActivityFilter = "all" | "content" | "media" | "system";

const DEFAULT_VISIBLE_COUNT = 8;
const EXPANDED_VISIBLE_COUNT = 20;

function classifyActivity(entry: ActivityEntry): Exclude<ActivityFilter, "all"> {
  const action = entry.action.toLowerCase();
  const resource = entry.resourceType.toLowerCase();
  if (
    action.startsWith("media.") ||
    resource.includes("media") ||
    resource.includes("asset")
  ) {
    return "media";
  }
  if (
    action.startsWith("backup.") ||
    action.startsWith("import.") ||
    action.startsWith("export.") ||
    resource.includes("system") ||
    resource.includes("health")
  ) {
    return "system";
  }
  return "content";
}

function formatAuditTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US")} ${d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function DashboardRecentActivity({ entries }: { entries: ActivityEntry[] }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo(() => {
    const base = { all: entries.length, content: 0, media: 0, system: 0 };
    for (const entry of entries) {
      const category = classifyActivity(entry);
      base[category] += 1;
    }
    return base;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "all" && classifyActivity(entry) !== filter) return false;
      if (!normalizedQuery) return true;
      return (
        entry.action.toLowerCase().includes(normalizedQuery) ||
        entry.resourceType.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [entries, filter, query]);

  const visibleEntries = filteredEntries.slice(
    0,
    expanded ? EXPANDED_VISIBLE_COUNT : DEFAULT_VISIBLE_COUNT
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All ({counts.all})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "content" ? "default" : "outline"}
            onClick={() => setFilter("content")}
          >
            Content ({counts.content})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "media" ? "default" : "outline"}
            onClick={() => setFilter("media")}
          >
            Media ({counts.media})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "system" ? "default" : "outline"}
            onClick={() => setFilter("system")}
          >
            System ({counts.system})
          </Button>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by action or resource"
          className="h-9"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredEntries.length === 0 ? (
          <p className="text-sm text-slate-500">No activity matches the current filter.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {visibleEntries.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{item.action}</span>
                    {" · "}
                    <span className="text-slate-600">{item.resourceType}</span>
                  </p>
                  <p className="text-xs text-slate-500">{formatAuditTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
            {filteredEntries.length > DEFAULT_VISIBLE_COUNT ? (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  {expanded ? "Show less" : `Show more (${filteredEntries.length - DEFAULT_VISIBLE_COUNT})`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
