"use client";

import { memo } from "react";
import { MarkdownSlashTextarea } from "@/components/editor/markdown-slash-textarea";

type Props = {
  content: string;
  onContentChange: (next: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  /** Default true: TOC, date, callout, rule without typing `/`. */
  showQuickInsertBar?: boolean;
  onTypingPulse?: () => void;
  onTypingEnd?: () => void;
};

/**
 * Isolates raw markdown typing from the rest of the immersive editor tree so
 * toolbar / save-bar state updates re-render less of the surface area.
 */
export const ImmersiveCustomMarkdownField = memo(function ImmersiveCustomMarkdownField({
  content,
  onContentChange,
  placeholder,
  "aria-label": ariaLabel,
  showQuickInsertBar = true,
  onTypingPulse,
  onTypingEnd,
}: Props) {
  return (
    <MarkdownSlashTextarea
      value={content}
      onChange={onContentChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      showQuickInsertBar={showQuickInsertBar}
      onTypingPulse={onTypingPulse}
      onTypingEnd={onTypingEnd}
    />
  );
});
