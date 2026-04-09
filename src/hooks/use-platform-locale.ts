"use client";

import { useSyncExternalStore } from "react";
import {
  PLATFORM_DEFAULT_LOCALE,
  SAAS_LOCALE_COOKIE,
  isPlatformLocale,
  type PlatformLocale,
} from "@/i18n/platform";

/** No push subscription: locale changes only via full navigation after cookie update. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- useSyncExternalStore contract
function subscribe(_onStoreChange: () => void) {
  return () => {};
}

function getServerSnapshot(): PlatformLocale {
  return PLATFORM_DEFAULT_LOCALE;
}

function getClientSnapshot(): PlatformLocale {
  if (typeof document === "undefined") return PLATFORM_DEFAULT_LOCALE;
  const escaped = SAAS_LOCALE_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  const v = m?.[1];
  return isPlatformLocale(v) ? v : PLATFORM_DEFAULT_LOCALE;
}

/**
 * Resolves the SaaS platform UI locale from the middleware-negotiated cookie.
 */
export function usePlatformLocale(): PlatformLocale {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
