import { useCallback, useRef } from "react";

/**
 * Proportional scroll sync for two side-by-side <pre> panes (e.g. version diff split view).
 */
export function useSyncedPresPairScroll() {
  const leftRef = useRef<HTMLPreElement>(null);
  const rightRef = useRef<HTMLPreElement>(null);
  const syncing = useRef(false);

  const onLeftScroll = useCallback(() => {
    if (syncing.current) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    const rangeL = left.scrollHeight - left.clientHeight;
    const rangeR = right.scrollHeight - right.clientHeight;
    if (rangeL <= 0 || rangeR <= 0) return;
    syncing.current = true;
    right.scrollTop = (left.scrollTop / rangeL) * rangeR;
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  const onRightScroll = useCallback(() => {
    if (syncing.current) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;
    const rangeL = left.scrollHeight - left.clientHeight;
    const rangeR = right.scrollHeight - right.clientHeight;
    if (rangeL <= 0 || rangeR <= 0) return;
    syncing.current = true;
    left.scrollTop = (right.scrollTop / rangeR) * rangeL;
    queueMicrotask(() => {
      syncing.current = false;
    });
  }, []);

  return { leftRef, rightRef, onLeftScroll, onRightScroll };
}
