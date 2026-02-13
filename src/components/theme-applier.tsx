"use client";

import { useEffect } from "react";

/**
 * Always apply light theme. Dark theme and system preference are disabled
 * so the site does not switch to dark mode unexpectedly.
 */
export function ThemeApplier(_props: { themeMode?: string }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);
  return null;
}
