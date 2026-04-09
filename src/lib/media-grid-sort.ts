export type MediaGridSort = "newest" | "oldest" | "name-asc" | "name-desc" | "size-desc" | "size-asc";

export const MEDIA_GRID_SORT_OPTIONS: { value: MediaGridSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
];

export function isMediaGridSort(value: string): value is MediaGridSort {
  return MEDIA_GRID_SORT_OPTIONS.some((o) => o.value === value);
}

export type MediaGridSortableFile = {
  name: string;
  size: number;
  createdAt: string;
};

export function sortMediaFiles<T extends MediaGridSortableFile>(list: T[], sort: MediaGridSort): T[] {
  const out = [...list];
  const t = (iso: string) => new Date(iso).getTime();
  switch (sort) {
    case "newest":
      out.sort((a, b) => t(b.createdAt) - t(a.createdAt) || a.name.localeCompare(b.name));
      break;
    case "oldest":
      out.sort((a, b) => t(a.createdAt) - t(b.createdAt) || a.name.localeCompare(b.name));
      break;
    case "name-asc":
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      out.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "size-desc":
      out.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
      break;
    case "size-asc":
      out.sort((a, b) => a.size - b.size || a.name.localeCompare(b.name));
      break;
    default:
      break;
  }
  return out;
}
