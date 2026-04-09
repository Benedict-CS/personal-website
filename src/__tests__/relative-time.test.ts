import { formatAbsoluteDateTime, formatRelativeTime } from "@/lib/relative-time";

describe("formatRelativeTime", () => {
  const ref = new Date("2025-06-15T12:00:00.000Z").getTime();

  it("formats hours in the past", () => {
    const iso = new Date("2025-06-15T09:00:00.000Z").toISOString();
    expect(formatRelativeTime(iso, ref)).toBe("3 hours ago");
  });

  it("formats days in the past", () => {
    const iso = new Date("2025-06-12T12:00:00.000Z").toISOString();
    expect(formatRelativeTime(iso, ref)).toBe("3 days ago");
  });

  it("formats future instants", () => {
    const iso = new Date("2025-06-16T12:00:00.000Z").toISOString();
    expect(formatRelativeTime(iso, ref)).toBe("tomorrow");
  });
});

describe("formatAbsoluteDateTime", () => {
  it("includes calendar parts for a known ISO string", () => {
    const s = formatAbsoluteDateTime("2025-06-15T14:30:00.000Z");
    expect(s).toMatch(/2025/);
    expect(s).toMatch(/Jun/);
  });
});
