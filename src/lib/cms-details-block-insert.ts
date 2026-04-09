/**
 * HTML `<details>` block for long posts (GFM / MDX raw HTML). Editors can replace summary and body text.
 */
export function buildCmsDetailsBlockMarkdown(): string {
  return `<details>
<summary>Click to expand</summary>

Add optional hidden content here. Leave a blank line after the summary for readability.

</details>

`;
}
