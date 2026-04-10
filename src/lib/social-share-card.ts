export type ShareCardTheme = "slate" | "blue" | "emerald";

const ALLOWED_THEMES: ShareCardTheme[] = ["slate", "blue", "emerald"];

export function sanitizeShareCardTheme(value: string | null | undefined): ShareCardTheme {
  if (!value) return "slate";
  return ALLOWED_THEMES.includes(value as ShareCardTheme) ? (value as ShareCardTheme) : "slate";
}

export function buildSocialShareCardUrl(input: {
  title: string;
  subtitle?: string;
  label?: string;
  theme?: ShareCardTheme;
}): string {
  const params = new URLSearchParams();
  params.set("title", input.title.trim() || "Untitled");
  if (input.subtitle?.trim()) params.set("subtitle", input.subtitle.trim());
  if (input.label?.trim()) params.set("label", input.label.trim());
  if (input.theme) params.set("theme", input.theme);
  return `/api/og?${params.toString()}`;
}
