"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Calendar,
  CircleAlert,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Quote,
  Sigma,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildCmsCalloutMarkdown } from "@/lib/cms-callout-insert";
import { buildCmsDateInsertMarkdown } from "@/lib/cms-date-insert";
import { buildAutoTocMarkdownBlock } from "@/lib/markdown-toc";

type SlashItem = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  /** Static insert when `buildMarkdown` is not set */
  markdown: string;
  /** Build insert from document text with the slash command removed (e.g. auto-TOC). */
  buildMarkdown?: (documentWithoutSlash: string) => string;
};

const SLASH_ITEMS: SlashItem[] = [
  {
    id: "heading",
    label: "Heading",
    description: "Insert a level-2 heading",
    keywords: ["heading", "h2", "title", "section"],
    markdown: "## Heading\n\n",
  },
  {
    id: "code",
    label: "Code block",
    description: "Fenced code block",
    keywords: ["code", "snippet", "typescript", "js"],
    markdown: "```\ncode here\n```\n\n",
  },
  {
    id: "image",
    label: "Image",
    description: "Markdown image",
    keywords: ["image", "img", "photo", "picture"],
    markdown: "![Alt text](https://)\n\n",
  },
  {
    id: "quote",
    label: "Quote",
    description: "Blockquote",
    keywords: ["quote", "blockquote", "citation"],
    markdown: "> Quote text\n\n",
  },
  {
    id: "callout",
    label: "Callout",
    description: "Labeled note block (blockquote)",
    keywords: ["callout", "note", "tip", "aside", "alert", "admonition"],
    markdown: buildCmsCalloutMarkdown(),
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Smaller section title",
    keywords: ["h3", "heading", "subtitle"],
    markdown: "### Section\n\n",
  },
  {
    id: "bullet-list",
    label: "Bulleted list",
    description: "Unordered list",
    keywords: ["list", "bullet", "ul", "items"],
    markdown: "- First item\n- Second item\n\n",
  },
  {
    id: "numbered-list",
    label: "Numbered list",
    description: "Ordered list",
    keywords: ["numbered", "ordered", "ol", "steps"],
    markdown: "1. First step\n2. Second step\n\n",
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    keywords: ["divider", "hr", "separator", "line"],
    markdown: "\n---\n\n",
  },
  {
    id: "table",
    label: "Table",
    description: "GFM table starter",
    keywords: ["table", "grid", "columns"],
    markdown: "| Column | Column |\n| --- | --- |\n| Cell | Cell |\n\n",
  },
  {
    id: "math",
    label: "Math block",
    description: "Display equation (KaTeX)",
    keywords: ["math", "latex", "katex", "equation", "formula"],
    markdown: "$$\nE = mc^2\n$$\n\n",
  },
  {
    id: "toc",
    label: "Table of contents",
    description: "Anchor list from ## and ### headings",
    keywords: ["toc", "contents", "outline", "index", "nav"],
    markdown: "",
    buildMarkdown: (doc) => buildAutoTocMarkdownBlock(doc),
  },
  {
    id: "date",
    label: "Today’s date",
    description: "Long-form date + ISO for bylines",
    keywords: ["date", "today", "published", "updated", "time"],
    markdown: "",
    buildMarkdown: () => buildCmsDateInsertMarkdown(),
  },
];

/** Match `/query` at start of line (after optional spaces), cursor at end of match */
function matchSlashLine(text: string, cursorPos: number): { slashIndex: number; query: string } | null {
  const before = text.slice(0, cursorPos);
  const lineStart = before.lastIndexOf("\n") + 1;
  const line = before.slice(lineStart);
  const m = line.match(/^(\s*)\/([\w-]*)$/);
  if (!m) return null;
  return { slashIndex: lineStart + m[1].length, query: (m[2] ?? "").toLowerCase() };
}

function filterItems(query: string): SlashItem[] {
  if (!query) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(query) ||
      item.keywords.some((k) => k.includes(query) || query.includes(k)) ||
      item.id.includes(query)
  );
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  /** Visible TOC / date / callout shortcuts (immersive raw markdown, etc.). */
  showQuickInsertBar?: boolean;
  /** Called on focus and each input; parent can dim surrounding chrome and debounce idle. */
  onTypingPulse?: () => void;
  /** Called on blur; parent should restore chrome opacity. */
  onTypingEnd?: () => void;
};

type QuickInsertId = "toc" | "date" | "callout" | "divider";

export function MarkdownSlashTextarea({
  value,
  onChange,
  className,
  placeholder,
  "aria-label": ariaLabel,
  showQuickInsertBar = false,
  onTypingPulse,
  onTypingEnd,
}: Props) {
  /** Local text for zero-latency typing; parent syncs at most once per animation frame. */
  const [inner, setInner] = useState(value);
  const rafRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [slash, setSlash] = useState<{ slashIndex: number; query: string; selected: number } | null>(null);
  const [toolbar, setToolbar] = useState<{ visible: boolean; top: number; left: number }>({
    visible: false,
    top: 0,
    left: 0,
  });
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setInner(value);
  }, [value]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const flushTypingToParent = useCallback(() => {
    rafRef.current = null;
    const ta = taRef.current;
    if (!ta) return;
    onChange(ta.value);
  }, [onChange]);

  const scheduleTypingFlush = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushTypingToParent);
  }, [flushTypingToParent]);

  const insertQuick = useCallback(
    (itemId: QuickInsertId) => {
      const item = SLASH_ITEMS.find((x) => x.id === itemId);
      if (!item) return;
      const ta = taRef.current;
      if (!ta) return;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const live = ta.value;
      const before = live.slice(0, start);
      const after = live.slice(end);
      const docForBuild = before + after;
      const inserted =
        item.buildMarkdown != null ? item.buildMarkdown(docForBuild) : item.markdown;
      const next = before + inserted + after;
      setInner(next);
      onChange(next);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        const caret = before.length + inserted.length;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [onChange]
  );

  const applySlashInsert = useCallback(
    (item: SlashItem) => {
      const ta = taRef.current;
      if (!ta || !slash) return;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const { slashIndex } = slash;
      const end = ta.selectionStart;
      const live = ta.value;
      const before = live.slice(0, slashIndex);
      const after = live.slice(end);
      const docSansSlash = before + after;
      const inserted =
        item.buildMarkdown != null ? item.buildMarkdown(docSansSlash) : item.markdown;
      const next = before + inserted + after;
      setInner(next);
      onChange(next);
      setSlash(null);
      requestAnimationFrame(() => {
        const pos = taRef.current;
        if (!pos) return;
        const caret = before.length + inserted.length;
        pos.focus();
        pos.setSelectionRange(caret, caret);
      });
    },
    [onChange, slash]
  );

  const wrapSelection = useCallback(
    (beforeWrap: string, afterWrap: string) => {
      const ta = taRef.current;
      if (!ta) return;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end) return;
      const live = ta.value;
      const sel = live.slice(start, end);
      const next = live.slice(0, start) + beforeWrap + sel + afterWrap + live.slice(end);
      setInner(next);
      onChange(next);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(start + beforeWrap.length, start + beforeWrap.length + sel.length);
      });
    },
    [onChange]
  );

  const updateToolbarPos = useCallback(() => {
    const ta = taRef.current;
    if (!ta) {
      setToolbar((t) => ({ ...t, visible: false }));
      return;
    }
    if (ta.selectionStart === ta.selectionEnd) {
      setToolbar((t) => ({ ...t, visible: false }));
      return;
    }
    const rect = ta.getBoundingClientRect();
    const mid = rect.left + Math.min(rect.width / 2 - 80, rect.width - 200);
    setToolbar({
      visible: true,
      top: rect.top - 44,
      left: Math.max(8, mid),
    });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slash) {
      const filtered = filterItems(slash.query);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlash((s) =>
          s ? { ...s, selected: Math.min(s.selected + 1, Math.max(0, filtered.length - 1)) } : s
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlash((s) => (s ? { ...s, selected: Math.max(0, s.selected - 1) } : s));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[slash.selected];
        if (item) applySlashInsert(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTypingPulse?.();
    const next = e.target.value;
    const pos = e.target.selectionStart;
    setInner(next);
    scheduleTypingFlush();
    const m = matchSlashLine(next, pos);
    if (m) {
      const filtered = filterItems(m.query);
      if (filtered.length === 0) {
        setSlash(null);
        setSlashMenuPos(null);
      } else {
        setSlash({ slashIndex: m.slashIndex, query: m.query, selected: 0 });
        const r = e.target.getBoundingClientRect();
        setSlashMenuPos({ top: r.top + 36, left: r.left + 8, width: Math.min(r.width - 16, 420) });
      }
    } else {
      setSlash(null);
      setSlashMenuPos(null);
    }
    requestAnimationFrame(() => updateToolbarPos());
  };

  const onSelect = () => {
    updateToolbarPos();
  };

  const filteredSlash = slash ? filterItems(slash.query) : [];

  return (
    <div className="relative">
      {showQuickInsertBar ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-2 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick insert
          </span>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              title="Table of contents from headings"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => insertQuick("toc")}
            >
              <ListTree className="h-3.5 w-3.5" aria-hidden />
              TOC
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              title="Today’s date"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => insertQuick("date")}
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Date
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              title="Callout block"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => insertQuick("callout")}
            >
              <CircleAlert className="h-3.5 w-3.5" aria-hidden />
              Callout
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              title="Horizontal rule"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => insertQuick("divider")}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden />
              Rule
            </Button>
          </div>
        </div>
      ) : null}
      <textarea
        ref={taRef}
        value={inner}
        onChange={onInput}
        onKeyDown={onKeyDown}
        onMouseUp={onSelect}
        onKeyUp={onSelect}
        onFocus={() => {
          onTypingPulse?.();
        }}
        onBlur={() => {
          onTypingEnd?.();
          setTimeout(() => setSlash(null), 180);
          setToolbar((t) => ({ ...t, visible: false }));
        }}
        spellCheck
        rows={18}
        placeholder={placeholder}
        aria-label={ariaLabel ?? "Markdown content"}
        className={
          className ??
          "min-h-[20rem] w-full resize-y rounded-xl border border-border bg-card p-4 font-mono text-sm leading-relaxed text-foreground shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
        }
      />

      <AnimatePresence>
        {toolbar.visible && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto fixed z-[70] flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-lg"
            style={{
              top: toolbar.top,
              left: toolbar.left,
            }}
            onMouseDown={(ev) => ev.preventDefault()}
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              title="Bold"
              onClick={() => wrapSelection("**", "**")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              title="Italic"
              onClick={() => wrapSelection("*", "*")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              title="Inline code"
              onClick={() => wrapSelection("`", "`")}
            >
              <Code2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              title="Link"
              onClick={() => wrapSelection("[", "](https://)")}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {slash && filteredSlash.length > 0 && slashMenuPos && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="fixed z-[60] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            style={{
              top: slashMenuPos.top,
              left: slashMenuPos.left,
              width: slashMenuPos.width,
            }}
            role="listbox"
            aria-label="Insert block"
          >
            <p className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Insert block
            </p>
            <ul className="max-h-56 overflow-auto py-1">
              {filteredSlash.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === slash.selected}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                      i === slash.selected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/50"
                    }`}
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => applySlashInsert(item)}
                    onMouseEnter={() => setSlash((s) => (s ? { ...s, selected: i } : s))}
                  >
                    {item.id === "heading" && <Heading2 className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "h3" && <Heading3 className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "code" && <Code2 className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "image" && <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "quote" && <Quote className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "callout" && <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "bullet-list" && <List className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "numbered-list" && <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "divider" && <Minus className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "table" && <Table2 className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "math" && <Sigma className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "toc" && <ListTree className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    {item.id === "date" && <Calendar className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
                    <span>
                      <span className="font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-xs opacity-80">{item.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              ↑↓ Enter · Esc
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
