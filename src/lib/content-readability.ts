/**
 * Content readability analyzer for blog posts.
 *
 * Evaluates markdown content on three axes — structure, readability,
 * and media richness — and returns a composite score (0-100) with
 * actionable suggestions.
 */

export interface ReadabilitySignals {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  headingCount: number;
  h2Count: number;
  h3Count: number;
  linkCount: number;
  imageCount: number;
  codeBlockCount: number;
  listCount: number;
}

export type ReadabilityGrade = "Excellent" | "Good" | "Fair" | "Needs work";

export interface ReadabilitySuggestion {
  signal: string;
  message: string;
}

export interface ReadabilityResult {
  score: number;
  grade: ReadabilityGrade;
  breakdown: {
    structure: number;
    readability: number;
    richness: number;
  };
  signals: ReadabilitySignals;
  suggestions: ReadabilitySuggestion[];
}

const SENTENCE_TERMINATORS = /[.!?。！？]+/g;
const HEADING_RE = /^#{1,6}\s+/gm;
const H2_RE = /^##\s+/gm;
const H3_RE = /^###\s+/gm;
const IMAGE_RE = /!\[.*?\]\(.*?\)/g;
const LINK_RE = /(?<!!)\[.*?\]\(.*?\)/g;
const FENCED_CODE_RE = /^```[\s\S]*?^```/gm;
const LIST_ITEM_RE = /^[\t ]*[-*+]\s|^[\t ]*\d+\.\s/gm;

function stripMarkdownSyntax(md: string): string {
  let text = md;
  text = text.replace(FENCED_CODE_RE, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/!\[.*?\]\(.*?\)/g, "");
  text = text.replace(/\[([^\]]*)\]\(.*?\)/g, "$1");
  text = text.replace(/[*_~`]/g, "");
  text = text.replace(/<[^>]+>/g, "");
  return text;
}

function countWords(text: string): number {
  const stripped = stripMarkdownSyntax(text).trim();
  if (stripped.length === 0) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  const stripped = stripMarkdownSyntax(text).trim();
  if (stripped.length === 0) return 0;
  const parts = stripped.split(SENTENCE_TERMINATORS).filter((s) => s.trim().length > 0);
  return Math.max(1, parts.length);
}

function countParagraphs(md: string): number {
  const lines = md.split("\n");
  let paragraphs = 0;
  let inParagraph = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("#") && !trimmed.startsWith("```") && !trimmed.startsWith("- ") && !trimmed.startsWith("* ") && !trimmed.match(/^\d+\./)) {
      if (!inParagraph) {
        paragraphs++;
        inParagraph = true;
      }
    } else {
      inParagraph = false;
    }
  }
  return paragraphs;
}

export function extractReadabilitySignals(markdown: string): ReadabilitySignals {
  const wordCount = countWords(markdown);
  const sentenceCount = countSentences(markdown);
  const paragraphCount = countParagraphs(markdown);
  const avgSentenceLength = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  const headingCount = (markdown.match(HEADING_RE) || []).length;
  const h2Count = (markdown.match(H2_RE) || []).length;
  const h3Count = (markdown.match(H3_RE) || []).length;
  const imageCount = (markdown.match(IMAGE_RE) || []).length;
  const linkCount = (markdown.match(LINK_RE) || []).length;
  const codeBlockCount = (markdown.match(FENCED_CODE_RE) || []).length;
  const listCount = (markdown.match(LIST_ITEM_RE) || []).length;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    headingCount,
    h2Count,
    h3Count,
    linkCount,
    imageCount,
    codeBlockCount,
    listCount,
  };
}

function scoreStructure(s: ReadabilitySignals): number {
  let score = 0;

  if (s.wordCount >= 300) score += 15;
  else if (s.wordCount >= 100) score += 8;

  if (s.h2Count >= 2) score += 20;
  else if (s.h2Count >= 1) score += 10;

  if (s.h3Count >= 1) score += 10;

  if (s.wordCount > 0 && s.headingCount > 0) {
    const wordsPerHeading = s.wordCount / s.headingCount;
    if (wordsPerHeading >= 100 && wordsPerHeading <= 400) score += 15;
    else if (wordsPerHeading >= 50 && wordsPerHeading <= 600) score += 8;
  }

  if (s.paragraphCount >= 3) score += 15;
  else if (s.paragraphCount >= 2) score += 8;

  if (s.listCount >= 1) score += 10;

  const raw = Math.min(100, score);
  return Math.round((raw / 85) * 100);
}

function scoreReadability(s: ReadabilitySignals): number {
  let score = 0;

  if (s.avgSentenceLength >= 10 && s.avgSentenceLength <= 20) score += 40;
  else if (s.avgSentenceLength >= 8 && s.avgSentenceLength <= 25) score += 25;
  else if (s.avgSentenceLength > 0) score += 10;

  if (s.paragraphCount >= 3 && s.wordCount > 0) {
    const avgParagraphLength = s.wordCount / s.paragraphCount;
    if (avgParagraphLength <= 150) score += 30;
    else if (avgParagraphLength <= 250) score += 20;
    else score += 10;
  } else if (s.paragraphCount >= 1) {
    score += 10;
  }

  if (s.wordCount >= 200) score += 30;
  else if (s.wordCount >= 50) score += 15;

  return Math.min(100, score);
}

function scoreRichness(s: ReadabilitySignals): number {
  let score = 20;

  if (s.imageCount >= 2) score += 25;
  else if (s.imageCount >= 1) score += 15;

  if (s.linkCount >= 3) score += 20;
  else if (s.linkCount >= 1) score += 10;

  if (s.codeBlockCount >= 1) score += 20;

  if (s.listCount >= 2) score += 15;
  else if (s.listCount >= 1) score += 10;

  return Math.min(100, score);
}

function buildSuggestions(s: ReadabilitySignals): ReadabilitySuggestion[] {
  const suggestions: ReadabilitySuggestion[] = [];

  if (s.wordCount < 100) {
    suggestions.push({
      signal: "length",
      message: "Content is very short. Aim for at least 300 words for a substantive post.",
    });
  } else if (s.wordCount < 300) {
    suggestions.push({
      signal: "length",
      message: "Consider expanding the content — posts with 300+ words tend to perform better in search.",
    });
  }

  if (s.headingCount === 0 && s.wordCount > 150) {
    suggestions.push({
      signal: "headings",
      message: "Add headings (## Section) to break up the content and improve scannability.",
    });
  }

  if (s.avgSentenceLength > 25) {
    suggestions.push({
      signal: "sentence_length",
      message: "Sentences average over 25 words. Consider breaking some into shorter ones for readability.",
    });
  }

  if (s.imageCount === 0 && s.wordCount > 200) {
    suggestions.push({
      signal: "images",
      message: "Add at least one image to make the post more engaging and shareable.",
    });
  }

  if (s.linkCount === 0 && s.wordCount > 200) {
    suggestions.push({
      signal: "links",
      message: "Add relevant links to reference material or related posts.",
    });
  }

  if (s.h2Count === 0 && s.h3Count > 0) {
    suggestions.push({
      signal: "heading_hierarchy",
      message: "Found ### headings without any ## headings — consider adding top-level sections first.",
    });
  }

  if (s.paragraphCount <= 1 && s.wordCount > 100) {
    suggestions.push({
      signal: "paragraphs",
      message: "Break the content into multiple paragraphs for better readability.",
    });
  }

  return suggestions;
}

function gradeFromScore(score: number): ReadabilityGrade {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

/**
 * Analyze markdown content and return a composite readability result.
 */
export function analyzeContentReadability(markdown: string): ReadabilityResult {
  const signals = extractReadabilitySignals(markdown);
  const structure = scoreStructure(signals);
  const readability = scoreReadability(signals);
  const richness = scoreRichness(signals);
  const score = Math.round(structure * 0.35 + readability * 0.40 + richness * 0.25);
  const grade = gradeFromScore(score);
  const suggestions = buildSuggestions(signals);

  return {
    score,
    grade,
    breakdown: { structure, readability, richness },
    signals,
    suggestions,
  };
}
