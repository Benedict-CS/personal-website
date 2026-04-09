"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/** Shown on /about?print=1 — uses the browser print dialog (Save as PDF). */
export function AboutPrintToolbar() {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Use <strong>Print</strong> and choose <strong>Save as PDF</strong> in the dialog for a clean export of this page.
      </p>
      <Button type="button" onClick={() => window.print()} className="shrink-0 gap-2">
        <Printer className="h-4 w-4" />
        Print / Save as PDF
      </Button>
    </div>
  );
}
