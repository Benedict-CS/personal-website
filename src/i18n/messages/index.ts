import type { PlatformLocale } from "../platform";
import type { PlatformMessages } from "./en";
import { platformMessagesEn } from "./en";
import { platformMessagesEs } from "./es";
import { platformMessagesDe } from "./de";
import { platformMessagesJa } from "./ja";

const table: Record<PlatformLocale, PlatformMessages> = {
  en: platformMessagesEn,
  es: platformMessagesEs,
  de: platformMessagesDe,
  ja: platformMessagesJa,
};

export function getPlatformMessages(locale: PlatformLocale): PlatformMessages {
  return table[locale] ?? platformMessagesEn;
}
