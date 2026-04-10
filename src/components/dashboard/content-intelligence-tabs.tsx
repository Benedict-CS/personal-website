"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

import { analyzeContentReadability, type ReadabilityResult, type ReadabilityGrade } from "@/lib/content-readability";
import { analyzeOutline, type OutlineAnalysis, type OutlineIssue } from "@/lib/outline-analyzer";
import { analyzeVocabulary, type VocabularyAnalysis, diversityGradeColor } from "@/lib/vocabulary-analyzer";
import { analyzeSeo, type SeoAnalysis, type SeoGrade } from "@/lib/seo-preview";
import { runPreflightChecks, verdictLabel, type PreflightResult, type PreflightVerdict, type CheckStatus } from "@/lib/publish-preflight";

import {
  Sparkles, List, BookA, Search, ShieldCheck,
  AlertTriangle, CheckCircle, XCircle, Hash,
  CircleCheck, CircleMinus, CircleAlert,
  Rocket, BrainCircuit,
} from "lucide-react";

type TabId = "readability" | "outline" | "vocabulary" | "seo" | "preflight";

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof Sparkles;
}

const TABS: TabDef[] = [
  { id: "readability", label: "Quality", icon: Sparkles },
  { id: "outline", label: "Outline", icon: List },
  { id: "vocabulary", label: "Words", icon: BookA },
  { id: "seo", label: "SEO", icon: Search },
  { id: "preflight", label: "Preflight", icon: ShieldCheck },
];

const READABILITY_GRADE_STYLES: Record<ReadabilityGrade, { bg: string; text: string; bar: string }> = {
  Excellent: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  Good: { bg: "bg-sky-50", text: "text-sky-700", bar: "bg-sky-500" },
  Fair: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  "Needs work": { bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-400" },
};

const SEO_GRADE_STYLES: Record<SeoGrade, { text: string }> = {
  Excellent: { text: "text-emerald-700" },
  Good: { text: "text-sky-700" },
  Fair: { text: "text-amber-700" },
  "Needs work": { text: "text-rose-700" },
};

const VERDICT_STYLES: Record<PreflightVerdict, { text: string }> = {
  ready: { text: "text-emerald-700" },
  review: { text: "text-amber-700" },
  blocked: { text: "text-rose-700" },
};

const STATUS_ICONS: Record<CheckStatus, { icon: typeof CheckCircle; color: string }> = {
  pass: { icon: CheckCircle, color: "text-emerald-500" },
  warn: { icon: AlertTriangle, color: "text-amber-500" },
  fail: { icon: XCircle, color: "text-rose-500" },
};

const LEVEL_INDENT: Record<number, string> = { 1: "pl-0", 2: "pl-0", 3: "pl-4", 4: "pl-8", 5: "pl-12", 6: "pl-16" };

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/60">
        <div className={cn("h-1.5 rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function outlineIssueIcon(type: OutlineIssue["type"]) {
  switch (type) {
    case "skipped_level": case "multiple_h1": case "no_headings":
      return <AlertTriangle className="h-3 w-3 text-rose-500" />;
    default:
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  }
}

function SeoSignalIcon({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.8) return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  if (ratio >= 0.5) return <CircleMinus className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  return <CircleAlert className="h-3.5 w-3.5 shrink-0 text-rose-400" />;
}

function tabBadge(tab: TabId, r: ReadabilityResult, o: OutlineAnalysis, v: VocabularyAnalysis, s: SeoAnalysis, p: PreflightResult): string | null {
  switch (tab) {
    case "readability": return `${r.score}`;
    case "outline": return o.issues.length > 0 ? `${o.issues.length}!` : o.headings.length > 0 ? "✓" : null;
    case "vocabulary": return v.totalWords > 0 ? `${Math.round(v.typeTokenRatio * 100)}%` : null;
    case "seo": return `${s.score}`;
    case "preflight": return `${p.passCount}/${p.checks.length}`;
  }
}

function badgeColor(tab: TabId, r: ReadabilityResult, o: OutlineAnalysis, v: VocabularyAnalysis, s: SeoAnalysis, p: PreflightResult): string {
  switch (tab) {
    case "readability": return r.score >= 60 ? "text-emerald-600" : r.score >= 40 ? "text-amber-600" : "text-rose-600";
    case "outline": return o.issues.length > 0 ? "text-amber-600" : "text-emerald-600";
    case "vocabulary": return v.typeTokenRatio >= 0.5 ? "text-emerald-600" : v.typeTokenRatio >= 0.35 ? "text-amber-600" : "text-rose-600";
    case "seo": return s.score >= 60 ? "text-emerald-600" : s.score >= 40 ? "text-amber-600" : "text-rose-600";
    case "preflight": return p.verdict === "ready" ? "text-emerald-600" : p.verdict === "review" ? "text-amber-600" : "text-rose-600";
  }
}

function ReadabilityTab({ result }: { result: ReadabilityResult }) {
  const style = READABILITY_GRADE_STYLES[result.grade];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-semibold tabular-nums", style.text)}>{result.score}</span>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", style.bg, style.text)}>{result.grade}</span>
      </div>
      <div className="grid gap-2.5">
        <ScoreBar value={result.breakdown.structure} label="Structure" color={style.bar} />
        <ScoreBar value={result.breakdown.readability} label="Readability" color={style.bar} />
        <ScoreBar value={result.breakdown.richness} label="Media & Links" color={style.bar} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
        <span>{result.signals.wordCount.toLocaleString()} words</span>
        <span>{result.signals.headingCount} headings</span>
        <span>{result.signals.imageCount} images</span>
        <span>{result.signals.linkCount} links</span>
        <span>{result.signals.codeBlockCount} code blocks</span>
      </div>
      {result.suggestions.length > 0 && (
        <ul className="space-y-1">
          {result.suggestions.map((s) => (
            <li key={s.signal} className="text-[11px] leading-relaxed text-muted-foreground"><span className="mr-1">→</span>{s.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OutlineTab({ analysis }: { analysis: OutlineAnalysis }) {
  return (
    <div className="space-y-3">
      {analysis.headings.length > 0 ? (
        <div className="rounded-md border border-border/60 bg-white/60 p-2">
          <ul className="space-y-0.5">
            {analysis.headings.map((h, idx) => (
              <li key={idx} className={cn("flex items-center gap-2 rounded px-2 py-1 text-[11px] hover:bg-muted/40 transition-colors", LEVEL_INDENT[h.level] ?? "pl-16")}>
                <Hash className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                <span className="min-w-0 flex-1 truncate text-foreground">{h.text}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground/70">{h.wordCount}w</span>
                <span className="shrink-0 rounded bg-muted/60 px-1 py-0.5 text-[9px] font-medium text-muted-foreground">H{h.level}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{analysis.documentWordCount > 0 ? "No headings found. Add ## headings to structure your content." : "Start writing to see the document outline."}</p>
      )}
      {analysis.issues.length > 0 && (
        <div className="space-y-1">
          {analysis.issues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2 rounded-md bg-white/60 px-2 py-1.5 text-[11px] leading-relaxed">
              {outlineIssueIcon(issue.type)}
              <span className="text-muted-foreground">{issue.message}</span>
            </div>
          ))}
        </div>
      )}
      {analysis.headings.length > 0 && (
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span>{analysis.documentWordCount.toLocaleString()} words</span>
          <span>Max depth: H{analysis.maxDepth}</span>
          <span>Avg section: {Math.round(analysis.documentWordCount / Math.max(1, analysis.totalSections))}w</span>
        </div>
      )}
    </div>
  );
}

function VocabularyTab({ analysis }: { analysis: VocabularyAnalysis }) {
  const gs = diversityGradeColor(analysis.grade);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-semibold tabular-nums", gs.text)}>{Math.round(analysis.typeTokenRatio * 100)}%</span>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", gs.bg, gs.text)}>{analysis.grade}</span>
        <span className="text-[11px] text-muted-foreground">{analysis.uniqueWords.toLocaleString()} unique / {analysis.totalWords.toLocaleString()} total</span>
      </div>
      {analysis.overusedWords.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-3 w-3 text-amber-500" />Overused words</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.overusedWords.map((ow) => (
              <span key={ow.word} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700" title={`"${ow.word}" appears ${ow.count}× (${ow.percentage}%)`}>{ow.word} <span className="tabular-nums text-amber-500">{ow.count}×</span></span>
            ))}
          </div>
        </div>
      )}
      {analysis.topContentWords.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top content words</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.topContentWords.map((tw) => (
              <span key={tw.word} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white/60 px-2 py-0.5 text-[11px] text-foreground">{tw.word} <span className="tabular-nums text-muted-foreground">{tw.count}</span></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeoTab({ result }: { result: SeoAnalysis }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-semibold tabular-nums", SEO_GRADE_STYLES[result.grade].text)}>{result.score}</span>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", result.grade === "Excellent" ? "bg-emerald-50 text-emerald-700" : result.grade === "Good" ? "bg-sky-50 text-sky-700" : result.grade === "Fair" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")}>{result.grade}</span>
      </div>
      <div className="rounded-xl border border-border bg-white p-3 shadow-[var(--elevation-1)]">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Google Search Preview</p>
        <div className="space-y-0.5">
          <p className="text-sm text-[#1a0dab] line-clamp-1" style={{ fontFamily: "Arial, sans-serif" }}>{result.serp.title}</p>
          <p className="text-xs text-[#006621] line-clamp-1" style={{ fontFamily: "Arial, sans-serif" }}>{result.serp.url}</p>
          <p className="text-xs leading-relaxed text-[#545454] line-clamp-2" style={{ fontFamily: "Arial, sans-serif" }}>{result.serp.description}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {result.signals.map((signal) => (
          <div key={signal.key} className="flex items-start gap-2 text-[11px] leading-relaxed">
            <SeoSignalIcon score={signal.score} maxScore={signal.maxScore} />
            <div className="min-w-0"><span className="font-medium text-foreground">{signal.label}</span><span className="mx-1 text-muted-foreground/50">·</span><span className="text-muted-foreground">{signal.detail}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreflightTab({ result }: { result: PreflightResult }) {
  const vs = VERDICT_STYLES[result.verdict];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-semibold", vs.text)}>{verdictLabel(result.verdict)}</span>
        <span className="text-[11px] text-muted-foreground">({result.passCount}/{result.checks.length} passed)</span>
      </div>
      <div className="space-y-1.5">
        {result.checks.map((check) => {
          const si = STATUS_ICONS[check.status];
          const Icon = si.icon;
          return (
            <div key={check.id} className="flex items-start gap-2 rounded-md bg-white/60 px-2.5 py-1.5">
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", si.color)} />
              <div className="min-w-0 text-[11px] leading-relaxed"><span className="font-medium text-foreground">{check.label}</span><span className="mx-1 text-muted-foreground/50">·</span><span className="text-muted-foreground">{check.detail}</span></div>
            </div>
          );
        })}
      </div>
      {result.verdict === "ready" && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-100/60 px-2.5 py-1.5 text-[11px] text-emerald-700">
          <Rocket className="h-3.5 w-3.5 shrink-0" />
          All checks passed. This post is ready for publishing.
        </div>
      )}
    </div>
  );
}

export function ContentIntelligenceTabs({
  title,
  slug,
  description,
  content,
  tags,
  className,
}: {
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("readability");

  const results = useMemo(() => ({
    readability: analyzeContentReadability(content),
    outline: analyzeOutline(content),
    vocabulary: analyzeVocabulary(content),
    seo: analyzeSeo({ title, slug, description, content }),
    preflight: runPreflightChecks({ title, slug, description, content, tags }),
  }), [title, slug, description, content, tags]);

  if (results.readability.signals.wordCount === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground", className)}>
        <span className="inline-flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5" />
          Start writing to see content intelligence analysis.
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card/80 overflow-hidden", className)}>
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/30">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = tabBadge(tab.id, results.readability, results.outline, results.vocabulary, results.seo, results.preflight);
          const bColor = badgeColor(tab.id, results.readability, results.outline, results.vocabulary, results.seo, results.preflight);
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-px",
                isActive ? "border-primary text-foreground bg-card/60" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge && <span className={cn("tabular-nums text-[10px] font-semibold", isActive ? bColor : "text-muted-foreground")}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-3">
        {activeTab === "readability" && <ReadabilityTab result={results.readability} />}
        {activeTab === "outline" && <OutlineTab analysis={results.outline} />}
        {activeTab === "vocabulary" && <VocabularyTab analysis={results.vocabulary} />}
        {activeTab === "seo" && <SeoTab result={results.seo} />}
        {activeTab === "preflight" && <PreflightTab result={results.preflight} />}
      </div>
    </div>
  );
}
