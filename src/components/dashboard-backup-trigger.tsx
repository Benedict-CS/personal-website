"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Archive } from "lucide-react";

export function DashboardBackupTrigger() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleTrigger = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/trigger", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || (res.ok ? "Done." : "Request failed."));
    } catch {
      setMessage("Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="min-w-[140px]">
      <CardContent className="pt-4">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full"
          onClick={handleTrigger}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
          {loading ? "Running…" : "Backup"}
        </Button>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Run script on server (MAINTENANCE.md)</p>
        {message && <p className="mt-2 text-xs text-[var(--foreground)] line-clamp-3">{message}</p>}
      </CardContent>
    </Card>
  );
}
