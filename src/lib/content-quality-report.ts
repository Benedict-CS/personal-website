/**
 * Content quality report generator.
 *
 * Runs readability, SEO, and structural analysis across all posts
 * and produces an aggregate quality report with per-post scores,
 * common issues, and a prioritized action list.
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

import { analyzeContentReadability, type ReadabilityResult } from "@/lib/content-readability";
import { analyzeSeo, type SeoAnalysis } from "@/lib/seo-preview";
import { analyzeOutline, type OutlineAnalysis } from "@/lib/outline-analyzer";

export interface PostForQualityReport {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string[];
  published: boolean;
}

export type QualityTier = "excellent" | "good" | "fair" | "poor";

export interface PostQualityScore {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  compositeScore: number;
  tier: QualityTier;
  readabilityScore: number;
  seoScore: number;
  structureIssueCount: number;
  topIssue: string | null;
}

export interface CommonIssue {
  issue: string;
  count: number;
  severity: "high" | "medium" | "low";
}

export interface QualityReport {
  totalPosts: number;
  averageScore: number;
  tierDistribution: Record<QualityTier, number>;
  commonIssues: CommonIssue[];
  actionItems: PostQualityScore[];
  topPerformers: PostQualityScore[];
}

function tierFromScore(score: number): QualityTier {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function analyzePost(post: PostForQualityReport): {
  readability: ReadabilityResult;
  seo: SeoAnalysis;
  outline: OutlineAnalysis;
} {
  const readability = analyzeContentReadability(post.content);
  const seo = analyzeSeo({
    title: post.title,
    slug: post.slug,
    description: post.description,
    content: post.content,
  });
  const outline = analyzeOutline(post.content);
  return { readability, seo, outline };
}

function identifyTopIssue(
  readability: ReadabilityResult,
  seo: SeoAnalysis,
  outline: OutlineAnalysis
): string | null {
  if (seo.score < 40) return "SEO needs significant improvement";
  if (readability.score < 40) return "Content readability is low";
  if (outline.issues.length > 2) return "Multiple structural issues found";
  if (seo.score < 60) return "SEO could be improved";
  if (readability.score < 60) return "Readability could be improved";
  if (outline.issues.length > 0) return outline.issues[0].message;
  return null;
}

function collectCommonIssues(
  analyses: Array<{ seo: SeoAnalysis; readability: ReadabilityResult; outline: OutlineAnalysis }>
): CommonIssue[] {
  const issueMap = new Map<string, { count: number; severity: "high" | "medium" | "low" }>();

  function bump(key: string, sev: "high" | "medium" | "low") {
    const existing = issueMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      issueMap.set(key, { count: 1, severity: sev });
    }
  }

  for (const { seo, readability, outline } of analyses) {
    if (seo.score < 40) bump("Low SEO score (below 40)", "high");
    else if (seo.score < 60) bump("Moderate SEO score (below 60)", "medium");

    if (readability.score < 40) bump("Low readability score (below 40)", "high");
    else if (readability.score < 60) bump("Moderate readability score (below 60)", "medium");

    for (const signal of seo.signals) {
      if (signal.score === 0 && signal.key === "meta_description") {
        bump("Missing meta description", "high");
      }
      if (signal.score === 0 && signal.key === "slug_quality") {
        bump("Missing or poor URL slug", "high");
      }
    }

    for (const issue of outline.issues) {
      if (issue.type === "no_headings") bump("No headings in long post", "medium");
      if (issue.type === "skipped_level") bump("Skipped heading levels", "low");
      if (issue.type === "long_section") bump("Overly long sections (>800 words)", "medium");
    }
  }

  return Array.from(issueMap.entries())
    .map(([issue, data]) => ({ issue, ...data }))
    .filter((i) => i.count > 0)
    .sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 };
      return sevOrder[a.severity] - sevOrder[b.severity] || b.count - a.count;
    })
    .slice(0, 8);
}

/**
 * Generate a quality report across all provided posts.
 *
 * @param posts — All posts to analyze
 * @param publishedOnly — If true, only analyze published posts (default: true)
 */
export function generateQualityReport(
  posts: PostForQualityReport[],
  publishedOnly: boolean = true
): QualityReport {
  const filtered = publishedOnly ? posts.filter((p) => p.published) : posts;

  if (filtered.length === 0) {
    return {
      totalPosts: 0,
      averageScore: 0,
      tierDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      commonIssues: [],
      actionItems: [],
      topPerformers: [],
    };
  }

  const analyses: Array<{
    post: PostForQualityReport;
    readability: ReadabilityResult;
    seo: SeoAnalysis;
    outline: OutlineAnalysis;
  }> = [];

  const scored: PostQualityScore[] = [];

  for (const post of filtered) {
    const { readability, seo, outline } = analyzePost(post);
    analyses.push({ post, readability, seo, outline });

    const compositeScore = Math.round(readability.score * 0.4 + seo.score * 0.4 + Math.max(0, 100 - outline.issues.length * 15) * 0.2);
    const tier = tierFromScore(compositeScore);
    const topIssue = identifyTopIssue(readability, seo, outline);

    scored.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      published: post.published,
      compositeScore,
      tier,
      readabilityScore: readability.score,
      seoScore: seo.score,
      structureIssueCount: outline.issues.length,
      topIssue,
    });
  }

  const totalScore = scored.reduce((sum, s) => sum + s.compositeScore, 0);
  const averageScore = Math.round(totalScore / scored.length);

  const tierDistribution: Record<QualityTier, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const s of scored) {
    tierDistribution[s.tier]++;
  }

  const commonIssues = collectCommonIssues(analyses.map((a) => ({ seo: a.seo, readability: a.readability, outline: a.outline })));

  const actionItems = [...scored]
    .filter((s) => s.topIssue !== null)
    .sort((a, b) => a.compositeScore - b.compositeScore)
    .slice(0, 5);

  const topPerformers = [...scored]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 3);

  return {
    totalPosts: filtered.length,
    averageScore,
    tierDistribution,
    commonIssues,
    actionItems,
    topPerformers,
  };
}
