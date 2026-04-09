import { isMediaGridSort, sortMediaFiles } from "@/lib/media-grid-sort";

const sample = [
  { name: "b.png", size: 200, createdAt: "2024-01-02T00:00:00.000Z" },
  { name: "a.png", size: 100, createdAt: "2024-01-03T00:00:00.000Z" },
  { name: "c.png", size: 150, createdAt: "2024-01-01T00:00:00.000Z" },
];

describe("isMediaGridSort", () => {
  it("accepts known sort keys", () => {
    expect(isMediaGridSort("newest")).toBe(true);
    expect(isMediaGridSort("size-asc")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isMediaGridSort("bogus")).toBe(false);
  });
});

describe("sortMediaFiles", () => {
  it("sorts by newest first", () => {
    const s = sortMediaFiles(sample, "newest");
    expect(s.map((f) => f.name)).toEqual(["a.png", "b.png", "c.png"]);
  });

  it("sorts by oldest first", () => {
    const s = sortMediaFiles(sample, "oldest");
    expect(s.map((f) => f.name)).toEqual(["c.png", "b.png", "a.png"]);
  });

  it("sorts by name ascending", () => {
    const s = sortMediaFiles(sample, "name-asc");
    expect(s.map((f) => f.name)).toEqual(["a.png", "b.png", "c.png"]);
  });

  it("sorts by size descending with name tie-break", () => {
    const s = sortMediaFiles(sample, "size-desc");
    expect(s.map((f) => f.name)).toEqual(["b.png", "c.png", "a.png"]);
  });
});
