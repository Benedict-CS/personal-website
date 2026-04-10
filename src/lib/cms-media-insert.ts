import { altTextFromImageFilename } from "@/lib/image-alt-from-filename";

/**
 * Cross-tab / same-origin messaging so the Media library can push markdown
 * into an open post or custom-page editor (BroadcastChannel).
 */

export const CMS_MEDIA_INSERT_CHANNEL = "personal-site-cms-media-v1";

export type CmsMediaInsertMessage = {
  type: "insert-markdown";
  markdown: string;
};

export function broadcastCmsMediaMarkdown(markdown: string): void {
  if (typeof window === "undefined") return;
  try {
    const ch = new BroadcastChannel(CMS_MEDIA_INSERT_CHANNEL);
    const msg: CmsMediaInsertMessage = { type: "insert-markdown", markdown };
    ch.postMessage(msg);
    ch.close();
  } catch {
    /* BroadcastChannel unavailable */
  }
}

export function subscribeCmsMediaInsert(onInsert: (markdown: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let ch: BroadcastChannel;
  try {
    ch = new BroadcastChannel(CMS_MEDIA_INSERT_CHANNEL);
  } catch {
    return () => {};
  }
  const handler = (ev: MessageEvent<CmsMediaInsertMessage>) => {
    const d = ev.data;
    if (d?.type === "insert-markdown" && typeof d.markdown === "string") {
      onInsert(d.markdown);
    }
  };
  ch.addEventListener("message", handler);
  return () => {
    ch.removeEventListener("message", handler);
    ch.close();
  };
}

export function markdownImageFromMediaFile(name: string, url: string): string {
  const alt = altTextFromImageFilename(name);
  return `![${alt}](${url})`;
}
