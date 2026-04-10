export type MarkdownVideoEmbed = {
  embedUrl: string;
  title: string;
};

/**
 * Resolve YouTube/Vimeo URLs to embeddable iframe URLs.
 */
export function resolveMarkdownVideoEmbed(url: string): MarkdownVideoEmbed | null {
  if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) {
    const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
    if (match) {
      return {
        embedUrl: `https://www.youtube.com/embed/${match[1]}`,
        title: "YouTube video",
      };
    }
  }

  if (url.includes("vimeo.com/") && !url.includes("/video/")) {
    const match = url.match(/vimeo\.com\/(\d+)(?:\/|$)/);
    if (match) {
      return {
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
        title: "Vimeo video",
      };
    }
  }

  return null;
}
