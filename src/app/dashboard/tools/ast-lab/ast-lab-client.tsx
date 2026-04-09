"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Braces,
  Boxes,
  Check,
  FileCode,
  Gem,
  Hexagon,
  ChevronDown,
  ChevronRight,
  Copy,
  Package,
  PackageOpen,
  PackageSearch,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistryLookupShell } from "@/components/dashboard/registry-lookup-shell";
import { parseMarkdownToMdast } from "@/lib/markdown-to-mdast";
import { computeMdastStats, isMdastContentArray } from "@/lib/mdast-lab-stats";
import {
  countSourceGraphemeClusters,
  countSourceLines,
  countSourceUtf8Bytes,
  countSourceWords,
} from "@/lib/markdown-source-metrics";
import type { Root as MdastRoot } from "mdast";

const SAMPLE = `# Hello AST

Paragraph with **bold** and a [link](https://example.com).

| Col | Val |
| --- | --- |
| a   | 1   |

\`\`\`ts
const x: number = 1;
\`\`\`

$$E = mc^2$$
`;

function AstNodeView({
  node,
  depth,
  defaultOpen,
}: {
  node: unknown;
  depth: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);

  if (node === null || node === undefined) {
    return (
      <span className="font-mono text-xs text-muted-foreground">null</span>
    );
  }

  if (typeof node !== "object") {
    return (
      <span className="font-mono text-xs text-foreground">
        {JSON.stringify(node)}
      </span>
    );
  }

  const rec = node as Record<string, unknown>;
  const type = typeof rec.type === "string" ? rec.type : "node";

  const keys = Object.keys(rec).filter((k) => k !== "position" && k !== "data");
  const hasNested =
    keys.some((k) => {
      const val = rec[k];
      if (val && typeof val === "object" && !Array.isArray(val) && "type" in (val as object)) {
        return true;
      }
      if (isMdastContentArray(val)) return val.length > 0;
      return false;
    }) || keys.length > 2;

  return (
    <div className="select-text font-mono text-[13px] leading-relaxed">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-1 rounded-md py-0.5 text-left hover:bg-accent/40 ${
          hasNested ? "" : "cursor-default hover:bg-transparent"
        }`}
        disabled={!hasNested}
        aria-expanded={open}
      >
        <span className="inline-flex w-4 shrink-0 justify-center">
          {hasNested ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </span>
        <span className="shrink-0 rounded bg-muted/70 px-1.5 py-px text-[11px] font-semibold text-foreground">
          {type}
        </span>
        {type === "text" && typeof rec.value === "string" ? (
          <span className="truncate text-muted-foreground">
            {" "}
            — <q>{rec.value.slice(0, 80)}{rec.value.length > 80 ? "…" : ""}</q>
          </span>
        ) : null}
      </button>
      {open && (
        <div className="ml-4 border-l border-border pl-2">
          {keys.map((key) => {
            const val = rec[key];
            if (key === "type") return null;
            if (val && typeof val === "object" && !Array.isArray(val) && "type" in (val as object)) {
              return (
                <div key={key} className="mt-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{key}: </span>
                  <AstNodeView node={val} depth={depth + 1} defaultOpen={depth < 1} />
                </div>
              );
            }
            if (isMdastContentArray(val)) {
              return (
                <div key={key} className="mt-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {key} ({val.length})
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {val.map((child, i) => (
                      <AstNodeView key={i} node={child} depth={depth + 1} defaultOpen={depth < 1} />
                    ))}
                  </div>
                </div>
              );
            }
            if (Array.isArray(val)) {
              return (
                <div key={key} className="mt-1 text-xs text-muted-foreground">
                  {key}: [{val.length} items]
                </div>
              );
            }
            return (
              <div key={key} className="mt-0.5 text-xs">
                <span className="text-muted-foreground">{key}: </span>
                <span className="text-foreground">{typeof val === "string" ? `"${val}"` : JSON.stringify(val)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type RegistryMetaResult = {
  name: string;
  version: string;
  description: string | null;
  license: string | null;
};

type AstTypeMatch = {
  path: string;
  preview: string;
};

function RegistryMetaDl({ data }: { data: RegistryMetaResult }) {
  return (
    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
        <dd className="font-mono text-foreground">{data.name}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Version</dt>
        <dd className="font-mono text-foreground">{data.version}</dd>
      </div>
      {data.license ? (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">License</dt>
          <dd className="font-mono text-foreground">{data.license}</dd>
        </div>
      ) : null}
      {data.description ? (
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</dt>
          <dd className="text-foreground leading-relaxed">{data.description}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function AstLabClient() {
  const [source, setSource] = useState(SAMPLE);
  const [copyOk, setCopyOk] = useState(false);
  const [npmQuery, setNpmQuery] = useState("next");
  const [npmLoading, setNpmLoading] = useState(false);
  const [npmData, setNpmData] = useState<RegistryMetaResult | null>(null);
  const [npmErr, setNpmErr] = useState<string | null>(null);
  const [pypiQuery, setPypiQuery] = useState("requests");
  const [pypiLoading, setPypiLoading] = useState(false);
  const [pypiData, setPypiData] = useState<RegistryMetaResult | null>(null);
  const [pypiErr, setPypiErr] = useState<string | null>(null);
  const [cratesQuery, setCratesQuery] = useState("serde");
  const [cratesLoading, setCratesLoading] = useState(false);
  const [cratesData, setCratesData] = useState<RegistryMetaResult | null>(null);
  const [cratesErr, setCratesErr] = useState<string | null>(null);
  const [nugetQuery, setNugetQuery] = useState("Newtonsoft.Json");
  const [nugetLoading, setNugetLoading] = useState(false);
  const [nugetData, setNugetData] = useState<RegistryMetaResult | null>(null);
  const [nugetErr, setNugetErr] = useState<string | null>(null);
  const [rubygemsQuery, setRubygemsQuery] = useState("rails");
  const [rubygemsLoading, setRubygemsLoading] = useState(false);
  const [rubygemsData, setRubygemsData] = useState<RegistryMetaResult | null>(null);
  const [rubygemsErr, setRubygemsErr] = useState<string | null>(null);
  const [packagistQuery, setPackagistQuery] = useState("symfony/http-foundation");
  const [packagistLoading, setPackagistLoading] = useState(false);
  const [packagistData, setPackagistData] = useState<RegistryMetaResult | null>(null);
  const [packagistErr, setPackagistErr] = useState<string | null>(null);
  const [hexpmQuery, setHexpmQuery] = useState("ecto");
  const [hexpmLoading, setHexpmLoading] = useState(false);
  const [hexpmData, setHexpmData] = useState<RegistryMetaResult | null>(null);
  const [hexpmErr, setHexpmErr] = useState<string | null>(null);
  const [gomoduleQuery, setGomoduleQuery] = useState("github.com/gin-gonic/gin");
  const [gomoduleLoading, setGomoduleLoading] = useState(false);
  const [gomoduleData, setGomoduleData] = useState<RegistryMetaResult | null>(null);
  const [gomoduleErr, setGomoduleErr] = useState<string | null>(null);
  const [nodeTypeQuery, setNodeTypeQuery] = useState("heading");
  const reduceMotion = useReducedMotion();

  const { tree, parseMs } = useMemo((): { tree: MdastRoot | null; parseMs: number | null } => {
    const t0 = globalThis.performance?.now?.() ?? 0;
    const hasPerf = typeof globalThis.performance?.now === "function";
    try {
      const parsed = parseMarkdownToMdast(source);
      const ms = hasPerf ? Math.round(globalThis.performance.now() - t0) : null;
      return { tree: parsed, parseMs: ms };
    } catch {
      const ms = hasPerf ? Math.round(globalThis.performance.now() - t0) : null;
      return { tree: null, parseMs: ms };
    }
  }, [source]);

  const jsonPretty = useMemo(() => (tree ? JSON.stringify(tree, null, 2) : ""), [tree]);

  const stats = useMemo(() => computeMdastStats(tree), [tree]);
  const typeMatches = useMemo<AstTypeMatch[]>(() => {
    if (!tree) return [];
    const needle = nodeTypeQuery.trim().toLowerCase();
    if (!needle) return [];
    const matches: AstTypeMatch[] = [];
    const visit = (node: unknown, path: string) => {
      if (!node || typeof node !== "object") return;
      const rec = node as Record<string, unknown>;
      const type = typeof rec.type === "string" ? rec.type : "";
      if (type.toLowerCase().includes(needle)) {
        const preview =
          typeof rec.value === "string"
            ? rec.value.slice(0, 60)
            : typeof rec.alt === "string"
              ? rec.alt.slice(0, 60)
              : type;
        matches.push({ path, preview });
      }
      if (matches.length >= 50) return;
      const children = rec.children;
      if (Array.isArray(children)) {
        children.forEach((child, idx) => {
          if (matches.length < 50) visit(child, `${path}.children[${idx}]`);
        });
      }
    };
    visit(tree, "root");
    return matches;
  }, [nodeTypeQuery, tree]);

  const lineCount = useMemo(() => countSourceLines(source), [source]);
  const wordCount = useMemo(() => countSourceWords(source), [source]);
  const utf8Bytes = useMemo(() => countSourceUtf8Bytes(source), [source]);
  const graphemeCount = useMemo(() => countSourceGraphemeClusters(source), [source]);

  const [sourceSha256Hex, setSourceSha256Hex] = useState<string | null>(null);

  useEffect(() => {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle?.digest) {
      setSourceSha256Hex(null);
      return;
    }
    let cancelled = false;
    const data = new TextEncoder().encode(source);
    void subtle
      .digest("SHA-256", data)
      .then((buf) => {
        if (cancelled) return;
        const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
        setSourceSha256Hex(hex);
      })
      .catch(() => {
        if (!cancelled) setSourceSha256Hex(null);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const copyJson = useCallback(async () => {
    if (!jsonPretty) return;
    try {
      await navigator.clipboard.writeText(jsonPretty);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      // ignore
    }
  }, [jsonPretty]);

  const lookupNpm = useCallback(async () => {
    const q = npmQuery.trim();
    if (!q) return;
    setNpmLoading(true);
    setNpmErr(null);
    setNpmData(null);
    try {
      const r = await fetch(`/api/integrations/npm?package=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setNpmErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setNpmData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setNpmErr("Network error");
    } finally {
      setNpmLoading(false);
    }
  }, [npmQuery]);

  const lookupPypi = useCallback(async () => {
    const q = pypiQuery.trim();
    if (!q) return;
    setPypiLoading(true);
    setPypiErr(null);
    setPypiData(null);
    try {
      const r = await fetch(`/api/integrations/pypi?package=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setPypiErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setPypiData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setPypiErr("Network error");
    } finally {
      setPypiLoading(false);
    }
  }, [pypiQuery]);

  const lookupCrates = useCallback(async () => {
    const q = cratesQuery.trim();
    if (!q) return;
    setCratesLoading(true);
    setCratesErr(null);
    setCratesData(null);
    try {
      const r = await fetch(`/api/integrations/crates?crate=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setCratesErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setCratesData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setCratesErr("Network error");
    } finally {
      setCratesLoading(false);
    }
  }, [cratesQuery]);

  const lookupNuget = useCallback(async () => {
    const q = nugetQuery.trim();
    if (!q) return;
    setNugetLoading(true);
    setNugetErr(null);
    setNugetData(null);
    try {
      const r = await fetch(`/api/integrations/nuget?package=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setNugetErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setNugetData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setNugetErr("Network error");
    } finally {
      setNugetLoading(false);
    }
  }, [nugetQuery]);

  const lookupRubygems = useCallback(async () => {
    const q = rubygemsQuery.trim();
    if (!q) return;
    setRubygemsLoading(true);
    setRubygemsErr(null);
    setRubygemsData(null);
    try {
      const r = await fetch(`/api/integrations/rubygems?gem=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setRubygemsErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setRubygemsData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setRubygemsErr("Network error");
    } finally {
      setRubygemsLoading(false);
    }
  }, [rubygemsQuery]);

  const lookupPackagist = useCallback(async () => {
    const q = packagistQuery.trim();
    if (!q) return;
    setPackagistLoading(true);
    setPackagistErr(null);
    setPackagistData(null);
    try {
      const r = await fetch(`/api/integrations/packagist?package=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setPackagistErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setPackagistData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setPackagistErr("Network error");
    } finally {
      setPackagistLoading(false);
    }
  }, [packagistQuery]);

  const lookupHexpm = useCallback(async () => {
    const q = hexpmQuery.trim().toLowerCase();
    if (!q) return;
    setHexpmLoading(true);
    setHexpmErr(null);
    setHexpmData(null);
    try {
      const r = await fetch(`/api/integrations/hexpm?package=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setHexpmErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setHexpmData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setHexpmErr("Network error");
    } finally {
      setHexpmLoading(false);
    }
  }, [hexpmQuery]);

  const lookupGomodule = useCallback(async () => {
    const q = gomoduleQuery.trim();
    if (!q) return;
    setGomoduleLoading(true);
    setGomoduleErr(null);
    setGomoduleData(null);
    try {
      const r = await fetch(`/api/integrations/gomodule?module=${encodeURIComponent(q)}`);
      const j = (await r.json().catch(() => ({}))) as RegistryMetaResult & { error?: string };
      if (!r.ok) {
        setGomoduleErr(typeof j.error === "string" ? j.error : "Lookup failed");
        return;
      }
      setGomoduleData({
        name: j.name,
        version: j.version,
        description: j.description ?? null,
        license: j.license ?? null,
      });
    } catch {
      setGomoduleErr("Network error");
    } finally {
      setGomoduleLoading(false);
    }
  }, [gomoduleQuery]);

  return (
    <div className="space-y-6">
      <div className="grid min-h-[min(70vh,720px)] gap-4 lg:grid-cols-2">
        <motion.div
          layout={!reduceMotion}
          className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card shadow-[var(--elevation-1)]"
        >
          <label className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Markdown
          </label>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-b-2xl bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Markdown source"
          />
        </motion.div>

        <div className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--elevation-1)]">
          <div className="border-b border-border px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Syntax tree
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => void copyJson()}
              >
                {copyOk ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copyOk ? "Copied" : "Copy JSON"}
              </Button>
            </div>
            <p
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] tabular-nums leading-snug text-muted-foreground"
              aria-live="polite"
            >
              <span title="Time for parseMarkdownToMdast in this browser">
                <span className="font-medium text-foreground/80">{parseMs ?? "—"}</span> ms parse
              </span>
              <span>
                <span className="font-medium text-foreground/80">{source.length.toLocaleString("en-US")}</span>{" "}
                chars
              </span>
              <span title="Grapheme clusters (Intl.Segmenter); differs from JS char count for emoji and combining marks">
                <span className="font-medium text-foreground/80">{graphemeCount.toLocaleString("en-US")}</span>{" "}
                graphemes
              </span>
              <span title="UTF-8 byte length (TextEncoder); can exceed JS char count for emoji and some symbols">
                <span className="font-medium text-foreground/80">{utf8Bytes.toLocaleString("en-US")}</span> UTF-8
                bytes
              </span>
              <span
                title={
                  sourceSha256Hex
                    ? `SHA-256 over UTF-8 bytes (full hex): ${sourceSha256Hex}`
                    : "SHA-256 of UTF-8 source (Web Crypto subtle.digest; unavailable in this context)"
                }
              >
                <span className="font-mono font-medium text-foreground/80">
                  {sourceSha256Hex ? `${sourceSha256Hex.slice(0, 10)}…` : "—"}
                </span>{" "}
                sha256
              </span>
              <span title="Words: trim, then split on whitespace; empty or whitespace-only is 0">
                <span className="font-medium text-foreground/80">{wordCount.toLocaleString("en-US")}</span> words
              </span>
              <span title="Line count: split on line feed (LF); empty source is 0 lines">
                <span className="font-medium text-foreground/80">{lineCount.toLocaleString("en-US")}</span> lines
              </span>
              {stats ? (
                <>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.nodes}</span> nodes
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.heading}</span> headings
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.code}</span> code
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.link}</span> links
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.image}</span> images
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.table}</span> tables
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.list}</span> lists
                  </span>
                  <span>
                    <span className="font-medium text-foreground/80">{stats.math}</span> math
                  </span>
                </>
              ) : null}
            </p>
            <div className="mt-3 rounded-lg border border-border/80 bg-background/70 p-2.5">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[11rem] flex-1">
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Node type query
                  </span>
                  <input
                    value={nodeTypeQuery}
                    onChange={(event) => setNodeTypeQuery(event.target.value)}
                    placeholder="heading, code, link, table..."
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground shadow-[var(--elevation-1)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/90">{typeMatches.length}</span> matches (max 50)
                </p>
              </div>
              {typeMatches.length > 0 ? (
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1 text-xs text-muted-foreground">
                  {typeMatches.slice(0, 8).map((match, idx) => (
                    <li key={`${match.path}-${idx}`} className="rounded bg-muted/40 px-2 py-1">
                      <span className="font-mono text-[11px] text-foreground/90">{match.path}</span>
                      <span className="ml-2 truncate">- {match.preview || "node"}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <AnimatePresence mode="wait">
              {tree ? (
                <motion.div
                  key="tree"
                  initial={reduceMotion ? false : { opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.15 }}
                >
                  <AstNodeView node={tree} depth={0} defaultOpen />
                </motion.div>
              ) : (
                <motion.p
                  key="err"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={reduceMotion ? { duration: 0 } : undefined}
                  className="text-sm text-red-600"
                >
                  Could not parse Markdown.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RegistryLookupShell
          icon={Package}
          title="npm registry (latest)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/npm</code>. Scoped names
              supported (e.g. <code className="font-mono text-[11px]">@vercel/analytics</code>).
            </p>
          }
          query={npmQuery}
          onQueryChange={setNpmQuery}
          onLookup={() => void lookupNpm()}
          loading={npmLoading}
          error={npmErr}
          inputLabel="npm package name"
        >
          {npmData ? <RegistryMetaDl data={npmData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={Boxes}
          title="PyPI (latest release)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/pypi</code> against{" "}
              <span className="font-mono text-[11px]">pypi.org</span> JSON API.
            </p>
          }
          query={pypiQuery}
          onQueryChange={setPypiQuery}
          onLookup={() => void lookupPypi()}
          loading={pypiLoading}
          error={pypiErr}
          inputLabel="PyPI package name"
        >
          {pypiData ? <RegistryMetaDl data={pypiData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={PackageSearch}
          title="crates.io (latest stable)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/crates</code> against{" "}
              <span className="font-mono text-[11px]">crates.io</span> JSON API.
            </p>
          }
          query={cratesQuery}
          onQueryChange={setCratesQuery}
          onLookup={() => void lookupCrates()}
          loading={cratesLoading}
          error={cratesErr}
          inputLabel="Rust crate name"
          placeholder="crate name"
        >
          {cratesData ? <RegistryMetaDl data={cratesData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={PackageOpen}
          title="NuGet (latest stable)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/nuget</code> against{" "}
              <span className="font-mono text-[11px]">nuget.org</span> search API (exact package id).
            </p>
          }
          query={nugetQuery}
          onQueryChange={setNugetQuery}
          onLookup={() => void lookupNuget()}
          loading={nugetLoading}
          error={nugetErr}
          inputLabel="NuGet package id"
          placeholder="Package.Id"
        >
          {nugetData ? <RegistryMetaDl data={nugetData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={Gem}
          title="RubyGems (latest)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/rubygems</code> against{" "}
              <span className="font-mono text-[11px]">rubygems.org</span> JSON API.
            </p>
          }
          query={rubygemsQuery}
          onQueryChange={setRubygemsQuery}
          onLookup={() => void lookupRubygems()}
          loading={rubygemsLoading}
          error={rubygemsErr}
          inputLabel="Ruby gem name"
          placeholder="gem-name"
        >
          {rubygemsData ? <RegistryMetaDl data={rubygemsData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={FileCode}
          title="Packagist (Composer, latest in index)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/packagist</code> against{" "}
              <span className="font-mono text-[11px]">repo.packagist.org</span> <code className="text-[11px]">p2</code> metadata.
            </p>
          }
          query={packagistQuery}
          onQueryChange={setPackagistQuery}
          onLookup={() => void lookupPackagist()}
          loading={packagistLoading}
          error={packagistErr}
          inputLabel="Composer package (vendor/package)"
          placeholder="vendor/package"
        >
          {packagistData ? <RegistryMetaDl data={packagistData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={Hexagon}
          title="Hex.pm (Elixir)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/hexpm</code> against{" "}
              <span className="font-mono text-[11px]">hex.pm</span> JSON API (single-segment package names).
            </p>
          }
          query={hexpmQuery}
          onQueryChange={setHexpmQuery}
          onLookup={() => void lookupHexpm()}
          loading={hexpmLoading}
          error={hexpmErr}
          inputLabel="Hex package name"
          placeholder="ecto"
        >
          {hexpmData ? <RegistryMetaDl data={hexpmData} /> : null}
        </RegistryLookupShell>
        <RegistryLookupShell
          icon={Terminal}
          title="Go module (@latest)"
          description={
            <p>
              Uses <code className="rounded bg-muted px-1 py-px font-mono text-[11px]">GET /api/integrations/gomodule</code> against{" "}
              <span className="font-mono text-[11px]">proxy.golang.org</span> <code className="text-[11px]">@latest</code>.
            </p>
          }
          query={gomoduleQuery}
          onQueryChange={setGomoduleQuery}
          onLookup={() => void lookupGomodule()}
          loading={gomoduleLoading}
          error={gomoduleErr}
          inputLabel="Module path"
          placeholder="github.com/org/repo"
        >
          {gomoduleData ? <RegistryMetaDl data={gomoduleData} /> : null}
        </RegistryLookupShell>
      </div>
    </div>
  );
}
