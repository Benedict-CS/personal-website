"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit?limit=100")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Audit log</h2>
      <p className="text-sm text-slate-600">
        Recent actions (post create/update/delete, import). Only visible when logged in.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <p className="text-slate-500">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-2 pr-4 font-medium text-slate-700">Time</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Action</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Resource</th>
                    <th className="pb-2 pr-4 font-medium text-slate-700">Details</th>
                    <th className="pb-2 font-medium text-slate-700">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                      <td className="py-2 pr-4 font-mono text-slate-800">{e.action}</td>
                      <td className="py-2 pr-4">{e.resourceType}{e.resourceId ? ` ${e.resourceId.slice(0, 8)}…` : ""}</td>
                      <td className="py-2 pr-4 text-slate-600 max-w-[200px] truncate" title={e.details ?? undefined}>{e.details ?? "—"}</td>
                      <td className="py-2 text-slate-500">{e.ip ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
