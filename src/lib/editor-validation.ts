export type EditorValidationResult = {
  valid: boolean;
  errors: Partial<Record<"title" | "slug" | "content", string>>;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function sanitizeSlugForStorage(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateTitle(title: string): string | undefined {
  const trimmed = title.trim();
  if (trimmed.length < 2) return "Title must be at least 2 characters.";
  if (trimmed.length > 120) return "Title must be 120 characters or fewer.";
  return undefined;
}

function validateSlug(slug: string, existingSlugs?: Set<string>, currentSlug?: string): string | undefined {
  const normalized = sanitizeSlugForStorage(slug);
  if (!normalized) return "Slug is required.";
  if (normalized.length > 80) return "Slug must be 80 characters or fewer.";
  if (!SLUG_PATTERN.test(normalized)) {
    return "Slug must use lowercase letters, numbers, and single hyphens only.";
  }
  if (existingSlugs && normalized !== currentSlug && existingSlugs.has(normalized)) {
    return "Slug already exists. Please choose a unique slug.";
  }
  return undefined;
}

function countWords(content: string): number {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function validateContent(content: string): string | undefined {
  const words = countWords(content);
  if (words < 10) {
    return "Content must include at least 10 words before saving.";
  }
  return undefined;
}

export function validateNewCustomPageInput(
  input: { title: string; slug: string },
  existingSlugs: Set<string>
): EditorValidationResult {
  const errors: EditorValidationResult["errors"] = {};
  const titleError = validateTitle(input.title);
  if (titleError) errors.title = titleError;
  const slugError = validateSlug(input.slug, existingSlugs);
  if (slugError) errors.slug = slugError;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateCustomPageDraft(input: {
  title: string;
  slug: string;
  content: string;
  existingSlugs?: Set<string>;
  currentSlug?: string;
}): EditorValidationResult {
  const errors: EditorValidationResult["errors"] = {};
  const titleError = validateTitle(input.title);
  if (titleError) errors.title = titleError;
  const slugError = validateSlug(input.slug, input.existingSlugs, input.currentSlug);
  if (slugError) errors.slug = slugError;
  const contentError = validateContent(input.content);
  if (contentError) errors.content = contentError;
  return { valid: Object.keys(errors).length === 0, errors };
}
