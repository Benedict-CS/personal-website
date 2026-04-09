/**
 * Markdown definition list (CommonMark-style) for glossaries and API docs.
 * Term lines followed by `: definition` on the next line.
 */
export function buildCmsDefinitionListMarkdown(): string {
  return `API surface
: Public functions and types authors should rely on.

Implementation detail
: Internal behavior that may change between releases.

`;

}
