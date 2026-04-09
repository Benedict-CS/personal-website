/**
 * GFM-style footnote starter (marker + definition). Requires footnote support in the Markdown pipeline.
 */
export function buildCmsFootnoteMarkdown(): string {
  return `Sentence with a reference or aside[^note].

[^note]: Replace this with the footnote body. Definitions can sit at the end of a section or the full post.

`;

}
