import { useEffect } from "react";

type UseCmsCrudShortcutsOptions = {
  enabled: boolean;
  submitting: boolean;
  onPublishAndSave?: () => void;
  onDelete?: () => void;
};

/**
 * Standard CMS keyboard shortcuts:
 * - Cmd/Ctrl + Enter: publish and save
 * - Cmd/Ctrl + Backspace: trigger delete flow
 */
export function useCmsCrudShortcuts(options: UseCmsCrudShortcutsOptions): void {
  const { enabled, submitting, onPublishAndSave, onDelete } = options;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (submitting) return;
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key;
      if (key === "Enter" && onPublishAndSave) {
        event.preventDefault();
        onPublishAndSave();
        return;
      }

      if ((key === "Backspace" || key === "Delete") && onDelete) {
        event.preventDefault();
        onDelete();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onDelete, onPublishAndSave, submitting]);
}
