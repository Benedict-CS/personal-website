export type EditorTarget =
  | { kind: "home" }
  | { kind: "about" }
  | { kind: "contact" }
  | { kind: "custom-page"; slug: string };

export function resolveEditorTarget(pathSegments: string[] | undefined): EditorTarget | null {
  if (!pathSegments || pathSegments.length === 0) return { kind: "home" };
  const segments = pathSegments.map((segment) => segment.toLowerCase().trim()).filter(Boolean);
  if (segments.length === 0) return { kind: "home" };
  if (segments.length === 1 && (segments[0] === "home" || segments[0] === "about" || segments[0] === "contact")) {
    return { kind: segments[0] };
  }
  if (segments.length === 2 && segments[0] === "page" && segments[1]) {
    return { kind: "custom-page", slug: segments[1] };
  }
  return null;
}
