export type PostPublicationState = "draft" | "scheduled" | "published";

type PublicationInput = {
  published?: boolean | null;
  publishedAt?: Date | string | null;
};

type PublicationNormalized = {
  published: boolean;
  publishedAt: Date | null;
  publicationState: PostPublicationState;
};

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const candidate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

export function resolvePublicationState(
  published: boolean,
  publishedAt: Date | null | undefined,
  now: Date = new Date()
): PostPublicationState {
  const when = parseDate(publishedAt);
  if (published) return "published";
  if (when && when.getTime() > now.getTime()) return "scheduled";
  if (when && when.getTime() <= now.getTime()) return "published";
  return "draft";
}

export function normalizePublicationInput(
  input: PublicationInput,
  now: Date = new Date()
): PublicationNormalized {
  const requestedPublished = Boolean(input.published);
  const requestedDate = parseDate(input.publishedAt);

  if (requestedPublished) {
    return {
      published: true,
      publishedAt: requestedDate ?? now,
      publicationState: "published",
    };
  }

  const publicationState = resolvePublicationState(false, requestedDate, now);
  if (publicationState === "published") {
    return {
      published: true,
      publishedAt: requestedDate ?? now,
      publicationState,
    };
  }

  return {
    published: false,
    publishedAt: publicationState === "scheduled" ? requestedDate : null,
    publicationState,
  };
}

export function withPublicationState<T extends { published: boolean; publishedAt?: Date | null }>(
  post: T,
  now: Date = new Date()
): T & { publicationState: PostPublicationState } {
  return {
    ...post,
    publicationState: resolvePublicationState(post.published, post.publishedAt ?? null, now),
  };
}
