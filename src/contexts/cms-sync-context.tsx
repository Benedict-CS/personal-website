"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type CmsSyncTopic = "posts" | "tags" | "media" | "settings" | "system";

type CmsSyncState = Record<CmsSyncTopic, number>;

type CmsSyncContextValue = {
  revisions: CmsSyncState;
  publish: (topic: CmsSyncTopic) => void;
};

const INITIAL_REVISIONS: CmsSyncState = {
  posts: 0,
  tags: 0,
  media: 0,
  settings: 0,
  system: 0,
};

const CmsSyncContext = createContext<CmsSyncContextValue | null>(null);

/**
 * Lightweight CMS synchronization layer for cross-panel and cross-tab updates.
 */
export function CmsSyncProvider({ children }: { children: React.ReactNode }) {
  const [revisions, setRevisions] = useState<CmsSyncState>(INITIAL_REVISIONS);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("cms-sync");
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const topic = event.data?.topic as CmsSyncTopic | undefined;
      if (!topic || !(topic in INITIAL_REVISIONS)) return;
      setRevisions((prev) => ({ ...prev, [topic]: prev[topic] + 1 }));
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const publish = useCallback((topic: CmsSyncTopic) => {
    setRevisions((prev) => ({ ...prev, [topic]: prev[topic] + 1 }));
    channelRef.current?.postMessage({ topic });
  }, []);

  const value = useMemo(() => ({ revisions, publish }), [publish, revisions]);
  return <CmsSyncContext.Provider value={value}>{children}</CmsSyncContext.Provider>;
}

export function useCmsSync() {
  const context = useContext(CmsSyncContext);
  if (!context) {
    throw new Error("useCmsSync must be used within a CmsSyncProvider.");
  }
  return context;
}
