/**
 * Vocabulary diversity analyzer.
 *
 * Measures the richness and variety of vocabulary in markdown content,
 * flagging overused words and computing the type-token ratio (TTR) —
 * a standard linguistic metric where higher values indicate more
 * diverse, engaging writing.
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export interface OverusedWord {
  word: string;
  count: number;
  percentage: number;
}

export interface TopWord {
  word: string;
  count: number;
}

export type DiversityGrade = "Excellent" | "Good" | "Fair" | "Repetitive";

export interface VocabularyAnalysis {
  totalWords: number;
  uniqueWords: number;
  typeTokenRatio: number;
  grade: DiversityGrade;
  overusedWords: OverusedWord[];
  topContentWords: TopWord[];
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
  "new", "one", "two", "way", "even", "well", "back", "still",
  "much", "many", "any", "own", "now", "just", "over", "such",
  "take", "come", "know", "see", "look", "want", "give", "tell",
  "work", "call", "try", "ask", "need", "feel", "become", "leave",
  "put", "mean", "keep", "let", "begin", "seem", "help", "show",
  "hear", "play", "run", "move", "live", "believe", "bring",
  "happen", "must", "say", "think", "thing", "things",
]);

function stripMarkdownToWords(md: string): string[] {
  const stripped = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/https?:\/\/\S+/g, "");

  return stripped
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function gradeFromTTR(ttr: number, totalWords: number): DiversityGrade {
  if (totalWords < 50) return "Good";
  if (ttr >= 0.65) return "Excellent";
  if (ttr >= 0.50) return "Good";
  if (ttr >= 0.35) return "Fair";
  return "Repetitive";
}

const OVERUSE_THRESHOLD = 0.03;
const MIN_OVERUSE_COUNT = 4;

/**
 * Analyze vocabulary diversity in markdown content.
 */
export function analyzeVocabulary(markdown: string): VocabularyAnalysis {
  const allWords = stripMarkdownToWords(markdown);
  const totalWords = allWords.length;

  if (totalWords === 0) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      typeTokenRatio: 0,
      grade: "Good",
      overusedWords: [],
      topContentWords: [],
    };
  }

  const uniqueSet = new Set(allWords);
  const uniqueWords = uniqueSet.size;
  const typeTokenRatio = Math.round((uniqueWords / totalWords) * 100) / 100;
  const grade = gradeFromTTR(typeTokenRatio, totalWords);

  const freq = new Map<string, number>();
  for (const word of allWords) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  const contentWords = [...freq.entries()]
    .filter(([word]) => !STOP_WORDS.has(word) && word.length >= 3)
    .sort((a, b) => b[1] - a[1]);

  const overusedWords: OverusedWord[] = contentWords
    .filter(([, count]) => {
      const pct = count / totalWords;
      return pct >= OVERUSE_THRESHOLD && count >= MIN_OVERUSE_COUNT;
    })
    .slice(0, 8)
    .map(([word, count]) => ({
      word,
      count,
      percentage: Math.round((count / totalWords) * 1000) / 10,
    }));

  const topContentWords: TopWord[] = contentWords
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    totalWords,
    uniqueWords,
    typeTokenRatio,
    grade,
    overusedWords,
    topContentWords,
  };
}

/**
 * Color class for the diversity grade.
 */
export function diversityGradeColor(grade: DiversityGrade): { bg: string; text: string } {
  switch (grade) {
    case "Excellent": return { bg: "bg-emerald-50", text: "text-emerald-700" };
    case "Good": return { bg: "bg-sky-50", text: "text-sky-700" };
    case "Fair": return { bg: "bg-amber-50", text: "text-amber-700" };
    case "Repetitive": return { bg: "bg-rose-50", text: "text-rose-700" };
  }
}
