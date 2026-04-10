/**
 * Publishing calendar and streak tracker.
 *
 * Computes a monthly calendar grid showing which days had published posts,
 * tracks the current publishing streak (consecutive weeks with at least
 * one post), and identifies the longest streak in history.
 *
 * Pure functions — no DB or network — deterministic and testable.
 */

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  postCount: number;
  dayOfWeek: number;
}

export interface CalendarMonth {
  year: number;
  month: number;
  label: string;
  days: CalendarDay[];
}

export interface PublishStreak {
  currentWeeks: number;
  longestWeeks: number;
  isActiveThisWeek: boolean;
  lastPublishDate: string | null;
  totalPublishDays: number;
}

export interface PublishCalendarData {
  calendar: CalendarMonth;
  streak: PublishStreak;
  busiestDay: { label: string; count: number } | null;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateKey(date);
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Build a calendar grid for the given month with post counts per day.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  publishDates: string[],
  now: Date = new Date()
): CalendarMonth {
  const dateCountMap = new Map<string, number>();
  for (const dateStr of publishDates) {
    const key = dateStr.slice(0, 10);
    dateCountMap.set(key, (dateCountMap.get(key) ?? 0) + 1);
  }

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];

  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i));
    const key = formatDateKey(d);
    days.push({
      date: key,
      dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(d, now),
      postCount: dateCountMap.get(key) ?? 0,
      dayOfWeek: d.getDay(),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = formatDateKey(d);
    days.push({
      date: key,
      dayOfMonth: day,
      isCurrentMonth: true,
      isToday: isSameDay(d, now),
      postCount: dateCountMap.get(key) ?? 0,
      dayOfWeek: d.getDay(),
    });
  }

  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = formatDateKey(d);
      days.push({
        date: key,
        dayOfMonth: d.getDate(),
        isCurrentMonth: false,
        isToday: isSameDay(d, now),
        postCount: dateCountMap.get(key) ?? 0,
        dayOfWeek: d.getDay(),
      });
    }
  }

  return {
    year,
    month,
    label: getMonthLabel(year, month),
    days,
  };
}

/**
 * Compute publishing streak: consecutive weeks with ≥1 post.
 */
export function computeStreak(
  publishDates: string[],
  now: Date = new Date()
): PublishStreak {
  if (publishDates.length === 0) {
    return {
      currentWeeks: 0,
      longestWeeks: 0,
      isActiveThisWeek: false,
      lastPublishDate: null,
      totalPublishDays: 0,
    };
  }

  const uniqueDays = new Set(publishDates.map((d) => d.slice(0, 10)));
  const sortedDates = [...uniqueDays].sort();
  const lastPublishDate = sortedDates[sortedDates.length - 1];

  const weekSet = new Set<string>();
  for (const dateStr of sortedDates) {
    weekSet.add(getWeekMonday(new Date(dateStr + "T12:00:00Z")));
  }

  const sortedWeeks = [...weekSet].sort().reverse();
  const currentWeekMonday = getWeekMonday(now);
  const isActiveThisWeek = weekSet.has(currentWeekMonday);

  let currentWeeks = 0;
  let checkWeek = new Date(currentWeekMonday + "T12:00:00Z");

  if (isActiveThisWeek) {
    while (weekSet.has(formatDateKey(checkWeek))) {
      currentWeeks++;
      checkWeek.setDate(checkWeek.getDate() - 7);
    }
  } else {
    const lastWeekMonday = new Date(currentWeekMonday + "T12:00:00Z");
    lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
    checkWeek = lastWeekMonday;
    if (weekSet.has(formatDateKey(checkWeek))) {
      while (weekSet.has(formatDateKey(checkWeek))) {
        currentWeeks++;
        checkWeek.setDate(checkWeek.getDate() - 7);
      }
    }
  }

  let longestWeeks = 0;
  let tempStreak = 0;
  for (let i = 0; i < sortedWeeks.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevWeek = new Date(sortedWeeks[i] + "T12:00:00Z");
      const currWeek = new Date(sortedWeeks[i - 1] + "T12:00:00Z");
      const diffDays = (currWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.abs(diffDays - 7) < 1) {
        tempStreak++;
      } else {
        longestWeeks = Math.max(longestWeeks, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestWeeks = Math.max(longestWeeks, tempStreak);

  return {
    currentWeeks,
    longestWeeks,
    isActiveThisWeek,
    lastPublishDate,
    totalPublishDays: uniqueDays.size,
  };
}

/**
 * Find the busiest day of the week for publishing.
 */
export function findBusiestDay(publishDates: string[]): { label: string; count: number } | null {
  if (publishDates.length === 0) return null;

  const dayCounts = new Array(7).fill(0);
  for (const dateStr of publishDates) {
    const d = new Date(dateStr + "T12:00:00Z");
    dayCounts[d.getDay()]++;
  }

  let maxIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > dayCounts[maxIdx]) maxIdx = i;
  }

  return dayCounts[maxIdx] > 0 ? { label: DAY_LABELS[maxIdx], count: dayCounts[maxIdx] } : null;
}

/**
 * Full calendar data builder.
 */
export function buildPublishCalendarData(
  publishDates: string[],
  now: Date = new Date()
): PublishCalendarData {
  const calendar = buildCalendarMonth(now.getFullYear(), now.getMonth(), publishDates, now);
  const streak = computeStreak(publishDates, now);
  const busiestDay = findBusiestDay(publishDates);

  return { calendar, streak, busiestDay };
}
