type Props = {
  title?: string;
  /** Comma-separated or single line of stack items */
  items?: string;
};

/**
 * Simple responsive grid of technology labels for MDX posts.
 */
export function TechStackGrid({ title = "Stack", items = "TypeScript, React, Next.js, PostgreSQL" }: Props) {
  const list = items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="not-prose my-8">
      <h3 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {list.map((item) => (
          <li
            key={item}
            className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-center text-sm font-medium text-slate-800"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
