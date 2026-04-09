import { useEffect, useRef } from "react";

/**
 * Approximate scroll sync between the MDEditor textarea and the preview column.
 * Re-binds when `contentKey` changes (preview height) or the editor remounts.
 */
export function useSplitEditorScroll(enabled: boolean, contentKey: string | number) {
  const leftWrapRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const left = leftWrapRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    let ta: HTMLTextAreaElement | null = null;
    let ro: ResizeObserver | null = null;
    let syncing = false;

    const syncAtoB = () => {
      if (syncing || !ta || !right) return;
      syncing = true;
      const ah = ta.scrollHeight - ta.clientHeight;
      const bh = right.scrollHeight - right.clientHeight;
      if (ah > 0 && bh > 0) {
        right.scrollTop = (ta.scrollTop / ah) * bh;
      }
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const syncBtoA = () => {
      if (syncing || !ta || !right) return;
      syncing = true;
      const ah = ta.scrollHeight - ta.clientHeight;
      const bh = right.scrollHeight - right.clientHeight;
      if (ah > 0 && bh > 0) {
        ta.scrollTop = (right.scrollTop / bh) * ah;
      }
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const tryBind = () => {
      ta = left.querySelector("textarea");
      if (!ta) return false;
      ta.addEventListener("scroll", syncAtoB, { passive: true });
      right.addEventListener("scroll", syncBtoA, { passive: true });
      ro = new ResizeObserver(() => syncAtoB());
      ro.observe(ta);
      ro.observe(right);
      return true;
    };

    let poll: ReturnType<typeof setInterval> | null = null;
    let pollTicks = 0;
    const raf = requestAnimationFrame(() => {
      if (tryBind()) return;
      poll = setInterval(() => {
        pollTicks += 1;
        if (tryBind() || pollTicks > 40) {
          if (poll) clearInterval(poll);
          poll = null;
        }
      }, 50);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (poll) clearInterval(poll);
      ta?.removeEventListener("scroll", syncAtoB);
      right.removeEventListener("scroll", syncBtoA);
      ro?.disconnect();
    };
  }, [enabled, contentKey]);

  return { leftWrapRef, rightRef };
}
