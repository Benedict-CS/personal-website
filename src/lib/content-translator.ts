export type SupportedTranslationLocale = "zh-TW" | "ja" | "es";

const LOCALE_LABELS: Record<SupportedTranslationLocale, string> = {
  "zh-TW": "Traditional Chinese",
  ja: "Japanese",
  es: "Spanish",
};

const GLOSSARY: Record<SupportedTranslationLocale, Record<string, string>> = {
  "zh-TW": {
    draft: "草稿",
    guide: "指南",
    summary: "摘要",
    architecture: "架構",
    performance: "效能",
    security: "安全",
    deployment: "部署",
  },
  ja: {
    draft: "下書き",
    guide: "ガイド",
    summary: "要約",
    architecture: "アーキテクチャ",
    performance: "パフォーマンス",
    security: "セキュリティ",
    deployment: "デプロイ",
  },
  es: {
    draft: "borrador",
    guide: "guia",
    summary: "resumen",
    architecture: "arquitectura",
    performance: "rendimiento",
    security: "seguridad",
    deployment: "despliegue",
  },
};

function replaceGlossaryTerms(text: string, locale: SupportedTranslationLocale): string {
  const dictionary = GLOSSARY[locale];
  let output = text;
  for (const [source, target] of Object.entries(dictionary)) {
    const regex = new RegExp(`\\b${source}\\b`, "gi");
    output = output.replace(regex, target);
  }
  return output;
}

function localizeTitle(title: string, locale: SupportedTranslationLocale): string {
  const translated = replaceGlossaryTerms(title, locale);
  return `${translated} (${locale})`;
}

function localizeDescription(description: string, locale: SupportedTranslationLocale): string {
  const translated = replaceGlossaryTerms(description, locale);
  return `[${locale}] ${translated}`;
}

export function buildTranslatedDraftScaffold(input: {
  title: string;
  description: string;
  content: string;
  locale: SupportedTranslationLocale;
}): {
  translatedTitle: string;
  translatedDescription: string;
  translatedContent: string;
  localeLabel: string;
} {
  const localeLabel = LOCALE_LABELS[input.locale];
  const translatedTitle = localizeTitle(input.title, input.locale);
  const translatedDescription = localizeDescription(input.description, input.locale);
  const translatedContent = [
    `> Auto-generated bilingual draft scaffold for **${localeLabel}**.`,
    `> Review and refine the translated section before publishing.`,
    "",
    `## ${translatedTitle}`,
    "",
    "> Add the translated body content here.",
    "",
    "---",
    "",
    "## Source (English)",
    "",
    input.content.trim(),
    "",
  ].join("\n");

  return {
    translatedTitle,
    translatedDescription,
    translatedContent,
    localeLabel,
  };
}
