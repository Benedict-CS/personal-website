import { buildTrendChartDisplay } from "@/components/dashboard/analytics-trend-chart";

describe("buildTrendChartDisplay", () => {
  it("keeps daily mode for short ranges", () => {
    const rows = Array.from({ length: 7 }, (_, idx) => ({
      day: `2026-04-${String(idx + 1).padStart(2, "0")}`,
      views: 1,
      cvDownloads: 0,
      leads: 0,
    }));

    const display = buildTrendChartDisplay(rows);
    expect(display.mode).toBe("daily");
    expect(display.rows).toHaveLength(7);
    expect(display.rows[0]?.label).toBe("04-01");
  });

  it("uses weekly buckets for medium ranges", () => {
    const rows = Array.from({ length: 60 }, (_, idx) => {
      const date = new Date(`2026-02-01T00:00:00`);
      date.setDate(date.getDate() + idx);
      return {
        day: date.toISOString().slice(0, 10),
        views: 1,
        cvDownloads: 0,
        leads: 0,
      };
    });

    const display = buildTrendChartDisplay(rows);
    expect(display.mode).toBe("weekly");
    expect(display.rows.length).toBeLessThan(rows.length);
  });

  it("uses monthly buckets for long ranges", () => {
    const rows = Array.from({ length: 160 }, (_, idx) => {
      const date = new Date(`2026-01-01T00:00:00`);
      date.setDate(date.getDate() + idx);
      return {
        day: date.toISOString().slice(0, 10),
        views: 1,
        cvDownloads: 0,
        leads: 0,
      };
    });

    const display = buildTrendChartDisplay(rows);
    expect(display.mode).toBe("monthly");
    expect(display.rows.length).toBeLessThan(12);
  });
});
