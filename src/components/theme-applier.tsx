"use client";

import { useEffect } from "react";

/**
 * Always apply light theme. Dark theme and system preference are disabled
 * so the site does not switch to dark mode unexpectedly.
 */
export function ThemeApplier({ themeMode }: { themeMode?: string }) {
  void themeMode;
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }, []);
  return null;
}
