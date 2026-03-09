"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type BreadcrumbOverride = { label: string } | null;

const BreadcrumbContext = createContext<{
  override: BreadcrumbOverride;
  setOverride: (v: BreadcrumbOverride) => void;
}>({ override: null, setOverride: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<BreadcrumbOverride>(null);
  return (
    <BreadcrumbContext.Provider value={{ override, setOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}
