/**
 * Extractive content summarizer.
 *
 * Selects the most representative sentences from markdown content
 * to generate auto-summary candidates suitable for meta descriptions.
 *
 * Scoring uses four signals:
 * 1. **Term Frequency** — sentences with high-frequency meaningful terms score higher
 * 2. **Position Bonus** — sentences near the start of the document score higher (lead bias)
 * 3. **Length Preference** — sentences of moderate length (10-30 words) score higher
 * 4. **Title Relevance** — sentences sharing keywords with the title score higher
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export interface SummarySentence {
  text: string;
  score: number;
  /** Position index in the original sentence list (0-based). */
  index: number;
}

export interface SummaryResult {
  /** Top-ranked sentences as summary candidates, sorted by score descending. */
  candidates: SummarySentence[];
  /** A ready-to-use meta description built from the top 1-2 sentences, truncated to ~155 chars. */
  suggested: string;
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
  "too", "very", "just", "about", "also", "if", "then", "into",
  "through", "during", "before", "after", "out", "up", "down",
  "here", "there", "while", "because", "although", "since",
  "get", "got", "like", "make", "made", "use", "used", "using",
  "new", "one", "two", "way", "even", "well", "back",
]);

function stripMarkdownForSentences(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\|[^\n]*\|/g, "")
    .replace(/^[-|:\s]+$/gm, "");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function buildTermFrequency(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return freq;
}

function scoreSentence(
  sentence: string,
  index: number,
  totalSentences: number,
  termFreq: Map<string, number>,
  titleKeywords: Set<string>
): number {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;

  let tfScore = 0;
  for (const w of words) {
    tfScore += termFreq.get(w) ?? 0;
  }
  tfScore = tfScore / words.length;

  const positionScore = totalSentences > 1
    ? 1 - (index / (totalSentences - 1)) * 0.6
    : 1;

  const wordCount = sentence.split(/\s+/).length;
  let lengthScore: number;
  if (wordCount >= 10 && wordCount <= 30) {
    lengthScore = 1.0;
  } else if (wordCount >= 5 && wordCount <= 50) {
    lengthScore = 0.7;
  } else {
    lengthScore = 0.3;
  }

  let titleScore = 0;
  if (titleKeywords.size > 0) {
    const matches = words.filter((w) => titleKeywords.has(w)).length;
    titleScore = matches / titleKeywords.size;
  }

  return tfScore * 0.35 + positionScore * 0.25 + lengthScore * 0.2 + titleScore * 0.2;
}

function truncateToLength(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}\u2026`;
}

/**
 * Generate summary candidates from markdown content.
 *
 * @param title — The post title (used for relevance boosting)
 * @param content — The full markdown content
 * @param maxCandidates — Maximum number of summary candidates to return (default 5)
 */
export function summarizeContent(
  title: string,
  content: string,
  maxCandidates: number = 5
): SummaryResult {
  const stripped = stripMarkdownForSentences(content);
  const sentences = splitSentences(stripped);

  if (sentences.length === 0) {
    return { candidates: [], suggested: "" };
  }

  const termFreq = buildTermFrequency(sentences);
  const titleKeywords = new Set(tokenize(title));

  const scored: SummarySentence[] = sentences.map((text, index) => ({
    text,
    score: Math.round(
      scoreSentence(text, index, sentences.length, termFreq, titleKeywords) * 100
    ) / 100,
    index,
  }));

  const candidates = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates);

  let suggested = "";
  if (candidates.length > 0) {
    const topByPosition = [...candidates].sort((a, b) => a.index - b.index);
    suggested = topByPosition[0].text;
    if (suggested.length < 80 && topByPosition.length > 1) {
      suggested = `${topByPosition[0].text} ${topByPosition[1].text}`;
    }
    suggested = truncateToLength(suggested, 155);
  }

  return { candidates, suggested };
}
