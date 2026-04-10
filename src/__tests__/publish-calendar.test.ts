import {
  buildCalendarMonth,
  computeStreak,
  findBusiestDay,
  buildPublishCalendarData,
} from "@/lib/publish-calendar";

const NOW = new Date("2026-04-10T12:00:00Z");

describe("buildCalendarMonth", () => {
  it("returns correct label for April 2026", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    expect(cal.label).toBe("April 2026");
    expect(cal.year).toBe(2026);
    expect(cal.month).toBe(3);
  });

  it("grid has a multiple-of-7 day count", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    expect(cal.days.length % 7).toBe(0);
  });

  it("marks current month days correctly", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    const aprilDays = cal.days.filter((d) => d.isCurrentMonth);
    expect(aprilDays.length).toBe(30);
  });

  it("marks today correctly", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    const today = cal.days.find((d) => d.isToday);
    expect(today).toBeDefined();
    expect(today!.dayOfMonth).toBe(10);
    expect(today!.isCurrentMonth).toBe(true);
  });

  it("counts posts per day", () => {
    const dates = ["2026-04-05T10:00:00Z", "2026-04-05T15:00:00Z", "2026-04-08T12:00:00Z"];
    const cal = buildCalendarMonth(2026, 3, dates, NOW);
    const apr5 = cal.days.find((d) => d.isCurrentMonth && d.dayOfMonth === 5);
    const apr8 = cal.days.find((d) => d.isCurrentMonth && d.dayOfMonth === 8);
    expect(apr5?.postCount).toBe(2);
    expect(apr8?.postCount).toBe(1);
  });

  it("handles months with no posts", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    expect(cal.days.every((d) => d.postCount === 0)).toBe(true);
  });

  it("includes leading days from previous month", () => {
    const cal = buildCalendarMonth(2026, 3, [], NOW);
    const firstDay = cal.days[0];
    if (firstDay.dayOfWeek !== 0) {
      expect(firstDay.isCurrentMonth).toBe(false);
    }
  });
});

describe("computeStreak", () => {
  it("returns 0 for no publish dates", () => {
    const streak = computeStreak([], NOW);
    expect(streak.currentWeeks).toBe(0);
    expect(streak.longestWeeks).toBe(0);
    expect(streak.isActiveThisWeek).toBe(false);
    expect(streak.lastPublishDate).toBeNull();
    expect(streak.totalPublishDays).toBe(0);
  });

  it("detects active week when post published this week", () => {
    const streak = computeStreak(["2026-04-08"], NOW);
    expect(streak.isActiveThisWeek).toBe(true);
    expect(streak.currentWeeks).toBeGreaterThanOrEqual(1);
  });

  it("counts consecutive weeks", () => {
    const dates = [
      "2026-04-06", // week of Apr 6
      "2026-03-30", // week of Mar 30
      "2026-03-23", // week of Mar 23
    ];
    const streak = computeStreak(dates, NOW);
    expect(streak.currentWeeks).toBeGreaterThanOrEqual(3);
  });

  it("breaks streak on gap week", () => {
    const dates = [
      "2026-04-08", // this week
      "2026-03-25", // skip one week
    ];
    const streak = computeStreak(dates, NOW);
    expect(streak.currentWeeks).toBe(1);
  });

  it("tracks longest streak separately from current", () => {
    const dates = [
      "2026-04-08",
      "2026-01-05",
      "2025-12-29",
      "2025-12-22",
      "2025-12-15",
    ];
    const streak = computeStreak(dates, NOW);
    expect(streak.longestWeeks).toBeGreaterThanOrEqual(4);
  });

  it("counts total unique publish days", () => {
    const dates = ["2026-04-01", "2026-04-01", "2026-04-05", "2026-04-08"];
    const streak = computeStreak(dates, NOW);
    expect(streak.totalPublishDays).toBe(3);
  });

  it("tracks last publish date", () => {
    const dates = ["2026-04-01", "2026-04-08"];
    const streak = computeStreak(dates, NOW);
    expect(streak.lastPublishDate).toBe("2026-04-08");
  });
});

describe("findBusiestDay", () => {
  it("returns null for no dates", () => {
    expect(findBusiestDay([])).toBeNull();
  });

  it("identifies the most popular publishing day", () => {
    const dates = [
      "2026-04-06", // Mon
      "2026-04-07", // Tue
      "2026-04-08", // Wed
      "2026-04-01", // Wed
      "2026-03-25", // Wed
    ];
    const busiest = findBusiestDay(dates);
    expect(busiest).not.toBeNull();
    expect(busiest!.label).toBe("Wed");
    expect(busiest!.count).toBe(3);
  });

  it("returns a valid day label", () => {
    const busiest = findBusiestDay(["2026-04-05"]);
    expect(busiest).not.toBeNull();
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(busiest!.label);
  });
});

describe("buildPublishCalendarData", () => {
  it("returns calendar, streak, and busiest day together", () => {
    const dates = ["2026-04-05", "2026-04-08"];
    const data = buildPublishCalendarData(dates, NOW);
    expect(data.calendar).toBeDefined();
    expect(data.calendar.label).toBe("April 2026");
    expect(data.streak).toBeDefined();
    expect(data.streak.totalPublishDays).toBe(2);
    expect(data.busiestDay).not.toBeNull();
  });

  it("handles empty dates", () => {
    const data = buildPublishCalendarData([], NOW);
    expect(data.calendar.days.length).toBeGreaterThan(0);
    expect(data.streak.currentWeeks).toBe(0);
    expect(data.busiestDay).toBeNull();
  });
});
