type SuggestionCandidate = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  content: string;
};

export type InternalLinkSuggestion = {
  id: string;
  slug: string;
  title: string;
  score: number;
  reasons: string[];
};

type BuildInternalLinkSuggestionsInput = {
  currentTitle: string;
  currentContent: string;
  currentTags: string[];
  candidates: SuggestionCandidate[];
  limit?: number;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "are",
  "was",
  "were",
  "into",
  "have",
  "has",
  "had",
  "about",
  "using",
  "use",
  "not",
  "but",
  "can",
  "will",
  "its",
  "our",
  "their",
  "how",
  "why",
  "what",
  "when",
  "where",
  "while",
  "under",
  "over",
  "then",
  "than",
  "also",
  "all",
  "any",
  "one",
  "two",
  "new",
  "post",
  "blog",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`*_#>()[\]{}.!?,:;/"'\\|-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function uniqueIntersectionCount(a: string[], b: string[]): number {
  const setB = new Set(b);
  let count = 0;
  const seen = new Set<string>();
  for (const token of a) {
    if (!seen.has(token) && setB.has(token)) {
      count += 1;
      seen.add(token);
    }
  }
  return count;
}

function linkedSlugsFromMarkdown(markdown: string): Set<string> {
  const set = new Set<string>();
  const regex = /\/blog\/([a-z0-9-]+)/gi;
  let match = regex.exec(markdown);
  while (match) {
    if (match[1]) set.add(match[1].toLowerCase());
    match = regex.exec(markdown);
  }
  return set;
}

export function buildInternalLinkSuggestions(
  input: BuildInternalLinkSuggestionsInput
): InternalLinkSuggestion[] {
  const currentTokens = tokenize(`${input.currentTitle}\n${input.currentContent}`).slice(0, 1200);
  const currentTagSet = new Set(input.currentTags.map((tag) => tag.toLowerCase().trim()).filter(Boolean));
  const alreadyLinked = linkedSlugsFromMarkdown(input.currentContent);
  const limit = input.limit ?? 6;

  const suggestions = input.candidates
    .filter((candidate) => !alreadyLinked.has(candidate.slug.toLowerCase()))
    .map((candidate) => {
      const candidateTitleTokens = tokenize(candidate.title);
      const candidateBodyTokens = tokenize(candidate.content).slice(0, 500);
      const titleOverlap = uniqueIntersectionCount(currentTokens, candidateTitleTokens);
      const bodyOverlap = uniqueIntersectionCount(currentTokens, candidateBodyTokens);
      const tagOverlap = candidate.tags.filter((tag) => currentTagSet.has(tag.toLowerCase().trim())).length;

      const score = tagOverlap * 6 + titleOverlap * 3 + Math.min(bodyOverlap, 4);
      const reasons: string[] = [];
      if (tagOverlap > 0) reasons.push(`${tagOverlap} shared tag${tagOverlap === 1 ? "" : "s"}`);
      if (titleOverlap > 0) reasons.push(`title keyword overlap (${titleOverlap})`);
      if (bodyOverlap > 0) reasons.push(`body keyword overlap (${bodyOverlap})`);

      return {
        id: candidate.id,
        slug: candidate.slug,
        title: candidate.title,
        score,
        reasons,
      };
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  return suggestions;
}
