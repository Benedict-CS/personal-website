/**
 * Auto-tag suggestion engine.
 *
 * Analyzes post title + content to extract significant terms, matches
 * them against existing tags in the system, and suggests both existing
 * tag matches and new tag candidates — ranked by relevance score.
 *
 * Pure functions — no DB or network access — easy to test deterministically.
 */

export interface ExistingTag {
  name: string;
  slug: string;
}

export interface TagSuggestion {
  tag: string;
  score: number;
  reason: string;
  isExisting: boolean;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "it", "its", "this", "that", "these", "those", "i", "you", "he",
  "she", "we", "they", "me", "him", "her", "us", "them", "my", "your",
  "his", "our", "their", "what", "which", "who", "whom", "how", "when",
  "where", "why", "all", "each", "every", "both", "few", "more", "most",
  "other", "some", "such", "no", "not", "only", "same", "so", "than",
  "too", "very", "just", "about", "above", "after", "before", "between",
  "into", "through", "during", "out", "up", "down", "over", "under",
  "again", "then", "once", "here", "there", "also", "if", "else",
  "while", "until", "because", "although", "since", "unless",
  "get", "got", "like", "make", "made", "use", "used", "using",
  "new", "one", "two", "way", "even", "well", "back", "see", "now",
  "know", "take", "come", "think", "look", "want", "give", "first",
  "last", "long", "great", "little", "own", "old", "right", "big",
  "still", "find", "let", "say", "try", "much", "many", "things",
  "thing", "really", "something", "anything", "everything",
]);

function stripMarkdownSyntax(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, " ")
    .replace(/<[^>]+>/g, " ");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }
  return bigrams;
}

function buildFrequencyMap(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

function matchExistingTag(
  term: string,
  existingTags: ExistingTag[]
): ExistingTag | null {
  const lower = term.toLowerCase();
  for (const tag of existingTags) {
    if (tag.name.toLowerCase() === lower || tag.slug === lower.replace(/\s+/g, "-")) {
      return tag;
    }
  }
  for (const tag of existingTags) {
    if (
      tag.name.toLowerCase().includes(lower) ||
      lower.includes(tag.name.toLowerCase())
    ) {
      return tag;
    }
  }
  return null;
}

/**
 * Suggest tags for a post based on its title and content.
 *
 * @param title - The post title
 * @param content - The full markdown content
 * @param existingTags - All tags currently in the system
 * @param currentTags - Tags already assigned to this post (comma-separated string)
 * @param maxSuggestions - Maximum number of suggestions to return
 */
export function suggestTags(
  title: string,
  content: string,
  existingTags: ExistingTag[],
  currentTags: string = "",
  maxSuggestions: number = 8
): TagSuggestion[] {
  const currentTagSet = new Set(
    currentTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );

  const titleTokens = tokenize(title);
  const contentPlain = stripMarkdownSyntax(content);
  const contentTokens = tokenize(contentPlain);
  const allTokens = [...titleTokens, ...contentTokens];

  if (allTokens.length === 0) return [];

  const wordFreq = buildFrequencyMap(contentTokens);
  const titleBigrams = extractBigrams(titleTokens);
  const contentBigrams = extractBigrams(contentTokens);
  const bigramFreq = buildFrequencyMap([...titleBigrams, ...contentBigrams]);

  const candidates = new Map<string, { score: number; reason: string; isExisting: boolean }>();

  for (const tag of existingTags) {
    const tagLower = tag.name.toLowerCase();
    if (currentTagSet.has(tagLower)) continue;

    let score = 0;
    const reasons: string[] = [];

    const tagTokens = tokenize(tag.name);
    for (const tt of tagTokens) {
      const titleHits = titleTokens.filter((t) => t === tt).length;
      if (titleHits > 0) {
        score += titleHits * 20;
        reasons.push("title match");
      }
      const contentHits = wordFreq.get(tt) ?? 0;
      if (contentHits > 0) {
        score += Math.min(contentHits * 3, 15);
        reasons.push(`${contentHits}× in content`);
      }
    }

    const fullTagLower = tag.name.toLowerCase();
    if (bigramFreq.has(fullTagLower)) {
      score += 25;
      reasons.push("phrase match");
    }

    if (score > 0) {
      const uniqueReasons = [...new Set(reasons)];
      candidates.set(tag.name, {
        score,
        reason: uniqueReasons.join(", "),
        isExisting: true,
      });
    }
  }

  const titleTerms = [...new Set(titleTokens)];
  for (const term of titleTerms) {
    if (term.length < 4) continue;
    const freq = wordFreq.get(term) ?? 0;
    if (freq < 2) continue;
    const existingMatch = matchExistingTag(term, existingTags);
    if (existingMatch) continue;
    if (currentTagSet.has(term)) continue;
    if (candidates.has(term)) continue;

    const capitalised = term.charAt(0).toUpperCase() + term.slice(1);
    candidates.set(capitalised, {
      score: 10 + freq * 2,
      reason: `${freq}× in content, appears in title`,
      isExisting: false,
    });
  }

  for (const [bigram, count] of bigramFreq.entries()) {
    if (count < 2) continue;
    if (candidates.has(bigram)) continue;
    const existingMatch = matchExistingTag(bigram, existingTags);
    if (existingMatch) continue;
    const bigramLower = bigram.toLowerCase();
    if (currentTagSet.has(bigramLower)) continue;

    const capitalised = bigram
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    candidates.set(capitalised, {
      score: 8 + count * 3,
      reason: `phrase appears ${count}× in content`,
      isExisting: false,
    });
  }

  return Array.from(candidates.entries())
    .map(([tag, data]) => ({ tag, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}
