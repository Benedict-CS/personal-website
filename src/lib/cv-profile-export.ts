type ResumeEntry = {
  title?: string;
  organization?: string;
  dateRange?: string;
  content?: string;
};

type SkillEntry = {
  category?: string;
  items?: string[];
};

type AchievementEntry = {
  title?: string;
  organization?: string;
  year?: string;
};

export type CvProfileSnapshot = {
  heroName?: string | null;
  heroTagline?: string | null;
  heroEmail?: string | null;
  heroPhone?: string | null;
  introText?: string | null;
  educationBlocks?: ResumeEntry[];
  experienceBlocks?: ResumeEntry[];
  volunteerBlocks?: ResumeEntry[];
  projectBlocks?: ResumeEntry[];
  technicalSkills?: SkillEntry[];
  achievements?: AchievementEntry[];
};

function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function parseBullets(content?: string): string[] {
  const text = clean(content);
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return text
    .split(/[.;]\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function pushSectionEntries(lines: string[], title: string, entries: ResumeEntry[] | undefined): void {
  const rows = Array.isArray(entries) ? entries : [];
  if (rows.length === 0) return;
  lines.push(`${title.toUpperCase()}`);
  for (const row of rows) {
    const heading = [clean(row.title), clean(row.organization)].filter(Boolean).join(" | ");
    if (heading) lines.push(`- ${heading}`);
    if (clean(row.dateRange)) lines.push(`  ${clean(row.dateRange)}`);
    const bullets = parseBullets(row.content);
    for (const bullet of bullets.slice(0, 6)) {
      lines.push(`  * ${bullet}`);
    }
  }
  lines.push("");
}

export function buildCvProfileLines(snapshot: CvProfileSnapshot): string[] {
  const lines: string[] = [];
  const name = clean(snapshot.heroName) || "Curriculum Vitae";
  lines.push(name);
  if (clean(snapshot.heroTagline)) lines.push(clean(snapshot.heroTagline));
  const contact = [clean(snapshot.heroEmail), clean(snapshot.heroPhone)].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  lines.push("");

  if (clean(snapshot.introText)) {
    lines.push("SUMMARY");
    lines.push(clean(snapshot.introText));
    lines.push("");
  }

  pushSectionEntries(lines, "Education", snapshot.educationBlocks);
  pushSectionEntries(lines, "Experience", snapshot.experienceBlocks);
  pushSectionEntries(lines, "Volunteer", snapshot.volunteerBlocks);
  pushSectionEntries(lines, "Projects", snapshot.projectBlocks);

  const skills = Array.isArray(snapshot.technicalSkills) ? snapshot.technicalSkills : [];
  if (skills.length > 0) {
    lines.push("SKILLS");
    for (const skill of skills) {
      const category = clean(skill.category);
      const items = Array.isArray(skill.items) ? skill.items.map((item) => clean(item)).filter(Boolean) : [];
      if (category && items.length > 0) {
        lines.push(`- ${category}: ${items.join(", ")}`);
      } else if (category) {
        lines.push(`- ${category}`);
      }
    }
    lines.push("");
  }

  const achievements = Array.isArray(snapshot.achievements) ? snapshot.achievements : [];
  if (achievements.length > 0) {
    lines.push("ACHIEVEMENTS");
    for (const entry of achievements) {
      const left = clean(entry.title);
      const right = [clean(entry.organization), clean(entry.year)].filter(Boolean).join(" · ");
      if (left && right) lines.push(`- ${left} (${right})`);
      else if (left) lines.push(`- ${left}`);
    }
    lines.push("");
  }

  return lines;
}
