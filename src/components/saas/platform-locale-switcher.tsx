"use client";

import { PLATFORM_LOCALES, SAAS_LOCALE_COOKIE, type PlatformLocale } from "@/i18n/platform";

type Props = {
  value: PlatformLocale;
  label: string;
};

/**
 * Sets the `saas_locale` cookie and reloads so dashboard copy matches the selected locale.
 */
export function PlatformLocaleSwitcher({ value, label }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <span className="whitespace-nowrap">{label}</span>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-slate-900"
        value={value}
        onChange={(e) => {
          const next = e.target.value as PlatformLocale;
          document.cookie = `${SAAS_LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
          window.location.reload();
        }}
      >
        {PLATFORM_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
