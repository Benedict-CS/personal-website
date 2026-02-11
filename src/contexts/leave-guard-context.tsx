"use client";

import { createContext, useCallback, useContext, useRef, useState, useEffect, type ReactNode } from "react";

type RequestLeaveFn = (url: string) => void;

const LeaveGuardContext = createContext<{
  dirty: boolean;
  setDirty: (v: boolean) => void;
  requestLeave: (url: string) => void;
  registerHandler: (fn: RequestLeaveFn | null) => void;
}>({
  dirty: false,
  setDirty: () => {},
  requestLeave: () => {},
  registerHandler: () => {},
});

let globalDirty = false;
const listeners = new Set<(dirty: boolean) => void>();
function setGlobalDirty(v: boolean) {
  globalDirty = v;
  listeners.forEach((fn) => fn(v));
}
function getGlobalDirty() {
  return globalDirty;
}

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtyState] = useState(false);
  const handlerRef = useRef<RequestLeaveFn | null>(null);

  const setDirty = useCallback((v: boolean) => {
    setGlobalDirty(v);
    setDirtyState(v);
  }, []);

  useEffect(() => {
    const l = (v: boolean) => setDirtyState(v);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const registerHandler = useCallback((fn: RequestLeaveFn | null) => {
    handlerRef.current = fn;
  }, []);

  const requestLeave = useCallback((url: string) => {
    if (getGlobalDirty() && handlerRef.current) handlerRef.current(url);
  }, []);

  return (
    <LeaveGuardContext.Provider
      value={{ dirty, setDirty, requestLeave, registerHandler }}
    >
      {children}
    </LeaveGuardContext.Provider>
  );
}

export function useLeaveGuard() {
  return useContext(LeaveGuardContext);
}
