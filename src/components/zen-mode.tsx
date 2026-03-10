"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Minimize2 } from "lucide-react";

type ZenContextValue = { zen: boolean; setZen: (v: boolean) => void };
const ZenContext = createContext<ZenContextValue | null>(null);

export function ZenModeProvider({ children }: { children: React.ReactNode }) {
  const [zen, setZen] = useState(false);

  useEffect(() => {
    if (zen) {
      document.body.classList.add("zen-mode");
      return () => document.body.classList.remove("zen-mode");
    }
  }, [zen]);

  const setZenStable = useCallback((v: boolean) => setZen(v), []);

  return (
    <ZenContext.Provider value={{ zen, setZen: setZenStable }}>
      {children}
    </ZenContext.Provider>
  );
}

function useZen() {
  const ctx = useContext(ZenContext);
  return ctx ?? { zen: false, setZen: () => {} };
}

export function ZenModeButton() {
  const { setZen } = useZen();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-slate-500 hover:text-slate-700"
      onClick={() => setZen(true)}
      aria-label="Enter Zen reading mode (full screen)"
    >
      Zen
    </Button>
  );
}

export function ZenModeExitButton() {
  const { zen, setZen } = useZen();

  useEffect(() => {
    if (!zen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen, setZen]);

  if (!zen) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] print:hidden">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-2 shadow-md bg-white border border-slate-200 hover:bg-slate-50"
        onClick={() => setZen(false)}
        aria-label="Exit Zen mode"
      >
        <Minimize2 className="h-4 w-4" />
        Exit Zen
      </Button>
    </div>
  );
}
