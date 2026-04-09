import { type RefObject, useEffect } from "react";

/**
 * Cmd+S / Ctrl+S submits the given form (CMS create/edit). Prevents the browser "Save page" dialog.
 */
export function useCmsFormSaveShortcut(
  formRef: RefObject<HTMLFormElement | null>,
  options: { enabled: boolean; submitting: boolean }
): void {
  const { enabled, submitting } = options;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (submitting) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "s" && e.key !== "S") return;
      e.preventDefault();
      formRef.current?.requestSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, submitting, formRef]);
}
