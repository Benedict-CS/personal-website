import type { ReactNode } from "react";

/**
 * Shared callout for developer integration blocks (GitHub, LeetCode, etc.).
 */
export function DevBlockMutedNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      {children}
    </div>
  );
}
