"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Award, GripVertical, Network, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SkillBlock = { category: string; items: string[] };
type AchievementBlock = { title: string; organization: string; year: string };
type SectionTitles = {
  education: string;
  experience: string;
  projects: string;
  skills: string;
  achievements: string;
};
type EditorActionSnapshot = {
  skills: SkillBlock[];
  achievements: AchievementBlock[];
};

const DEFAULT_SKILLS: SkillBlock[] = [
  { category: "Cloud Native & K8s", items: ["Kubernetes (K8s)", "Docker", "Helm", "Cilium (Service Mesh)", "Karmada", "Harbor", "Linux Containers (LXC)"] },
  { category: "CI/CD & GitOps", items: ["Jenkins", "GitLab CI/CD", "GitHub Actions", "ArgoCD", "Flux CD", "GitOps Workflow", "Git"] },
  { category: "Observability", items: ["Prometheus", "Grafana", "Thanos", "Monitoring & Logging"] },
  { category: "Infrastructure & Networking", items: ["Google Cloud Platform (GCP)", "Proxmox VE", "Ansible", "Linux Networking", "SSL/TLS Management"] },
];

const DEFAULT_ACHIEVEMENTS: AchievementBlock[] = [
  { title: "National Makerthon: Good Health and Well-Being - 1st Place", organization: "Ministry of Education 2022", year: "2022" },
  { title: "Vision Get Wild XR Social Welfare Potential Award", organization: "Meta XR Hub Taiwan 2023", year: "2023" },
  { title: "Intel DevCup x OpenVINO Toolkit Competition - Shortlisted", organization: "Intel Corporation 2021", year: "2021" },
  { title: "5G Mobileheroes - Shortlisted", organization: "Industrial Development Administration 2021", year: "2021" },
];

const SKILLS_SECTION_GAP_CLASS = "space-y-2";
const ACHIEVEMENTS_SECTION_GAP_CLASS = "space-y-1.5";
const BLOCK_CONTAINER_CLASS = "rounded-md p-2 transition-colors";
const BLOCK_HEADER_MARGIN_CLASS = "mb-1.5";
const ACTION_HISTORY_LIMIT = 50;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function trimRepeatedAchievementYear(organization: string, year: string): string {
  const org = organization.trim();
  const y = year.trim();
  if (!org || !y) return org;
  const pattern = new RegExp(`(?:[\\s,()\\-–—]+)?${escapeRegExp(y)}\\s*$`);
  return org.replace(pattern, "").trim();
}

function cloneActionSnapshot(snapshot: EditorActionSnapshot): EditorActionSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as EditorActionSnapshot;
}

export function AboutSkillsAchievementsEditor({
  initialSkills,
  initialAchievements,
  initialSectionTitles,
  mode = "both",
}: {
  initialSkills: SkillBlock[];
  initialAchievements: AchievementBlock[];
  initialSectionTitles: SectionTitles;
  mode?: "both" | "skills" | "achievements";
}) {
  const pathname = usePathname();
  const isEditor = pathname?.startsWith("/editor/about");
  const [skills, setSkills] = useState<SkillBlock[]>(
    initialSkills.length > 0 ? initialSkills : DEFAULT_SKILLS
  );
  const [achievements, setAchievements] = useState<AchievementBlock[]>(
    initialAchievements.length > 0 ? initialAchievements : DEFAULT_ACHIEVEMENTS
  );
  const [sectionTitles] = useState<SectionTitles>(initialSectionTitles);
  const [dragSkillFrom, setDragSkillFrom] = useState<number | null>(null);
  const [dragSkillOver, setDragSkillOver] = useState<number | null>(null);
  const [dragAchievementFrom, setDragAchievementFrom] = useState<number | null>(null);
  const [dragAchievementOver, setDragAchievementOver] = useState<number | null>(null);
  const pendingSkillFocusRef = useRef<{ blockIndex: number; skillIndex: number } | null>(null);
  const actionUndoRef = useRef<EditorActionSnapshot[]>([]);
  const actionRedoRef = useRef<EditorActionSnapshot[]>([]);
  const showSkills = mode === "both" || mode === "skills";
  const showAchievements = mode === "both" || mode === "achievements";

  useEffect(() => {
    if (!isEditor) return;
    const pendingSkillFocus = pendingSkillFocusRef.current;
    if (!pendingSkillFocus) return;
    const key = `technicalSkills.${pendingSkillFocus.blockIndex}.items.${pendingSkillFocus.skillIndex}`;
    const target = document.querySelector<HTMLElement>(`[data-about-edit="${key}"]`);
    if (!target) return;
    target.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    pendingSkillFocusRef.current = null;
  }, [isEditor, skills]);

  const move = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const pushActionHistory = useCallback(() => {
    const current = cloneActionSnapshot({ skills, achievements });
    actionUndoRef.current = [...actionUndoRef.current.slice(-(ACTION_HISTORY_LIMIT - 1)), current];
    actionRedoRef.current = [];
  }, [achievements, skills]);

  const applySkillsAction = useCallback(
    (updater: (current: SkillBlock[]) => SkillBlock[]) => {
      pushActionHistory();
      setSkills((current) => updater(current));
    },
    [pushActionHistory]
  );

  const applyAchievementsAction = useCallback(
    (updater: (current: AchievementBlock[]) => AchievementBlock[]) => {
      pushActionHistory();
      setAchievements((current) => updater(current));
    },
    [pushActionHistory]
  );

  const undoStructureAction = useCallback(() => {
    const previous = actionUndoRef.current.pop();
    if (!previous) return;
    const current = cloneActionSnapshot({ skills, achievements });
    actionRedoRef.current = [...actionRedoRef.current, current];
    setSkills(previous.skills);
    setAchievements(previous.achievements);
    pendingSkillFocusRef.current = null;
  }, [achievements, skills]);

  const redoStructureAction = useCallback(() => {
    const next = actionRedoRef.current.pop();
    if (!next) return;
    const current = cloneActionSnapshot({ skills, achievements });
    actionUndoRef.current = [...actionUndoRef.current, current];
    setSkills(next.skills);
    setAchievements(next.achievements);
    pendingSkillFocusRef.current = null;
  }, [achievements, skills]);

  useEffect(() => {
    if (!isEditor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) return;
      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!wantsUndo && !wantsRedo) return;

      const active = document.activeElement as HTMLElement | null;
      const isTypingTarget = !!active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
      );
      if (isTypingTarget) return;

      if (wantsUndo) {
        if (actionUndoRef.current.length === 0) return;
        event.preventDefault();
        undoStructureAction();
        return;
      }
      if (actionRedoRef.current.length === 0) return;
      event.preventDefault();
      redoStructureAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditor, redoStructureAction, undoStructureAction]);

  const AddBlockButton = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
      aria-label={label}
    >
      <span className="h-px flex-1 border-t border-dashed border-border transition-colors group-hover:border-muted-foreground/50" />
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border bg-card transition-colors group-hover:border-muted-foreground/50">
        <Plus className="h-4 w-4" />
      </span>
      <span className="h-px flex-1 border-t border-dashed border-border transition-colors group-hover:border-muted-foreground/50" />
    </button>
  );

  return (
    <>
      {showSkills && (
      <Card className="shadow-[var(--elevation-2)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Network className="h-5 w-5" />
            {isEditor ? (
              <span
                data-about-edit="sectionTitles.skills"
                className="rounded px-1"
              >
                {sectionTitles.skills}
              </span>
            ) : (
              sectionTitles.skills
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={SKILLS_SECTION_GAP_CLASS}>
            {skills.map((section, i) => (
              <div key={`${section.category}-${i}`}>
                <div
                  className={`${BLOCK_CONTAINER_CLASS} ${
                    dragSkillOver === i
                      ? "border border-muted-foreground/40 bg-muted"
                      : isEditor
                        ? "border border-border/60"
                        : "border-0"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragSkillFrom !== null) setDragSkillOver(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragSkillFrom === null) return;
                    applySkillsAction((current) => move(current, dragSkillFrom, i));
                    setDragSkillFrom(null);
                    setDragSkillOver(null);
                  }}
                >
                  {isEditor ? (
                    <>
                      <div className={`${BLOCK_HEADER_MARGIN_CLASS} flex items-start justify-between gap-2`}>
                        <div className="flex items-start gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDragSkillFrom(i)}
                          onDragEnd={() => {
                            setDragSkillFrom(null);
                            setDragSkillOver(null);
                          }}
                          className="mt-1 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground active:cursor-grabbing"
                          aria-label="Drag to reorder skill block"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <h3
                          className="mt-1 mb-1 text-sm font-semibold text-foreground rounded px-1"
                          data-about-edit={`technicalSkills.${i}.category`}
                        >
                          {section.category}
                        </h3>
                        </div>
                        <button
                          type="button"
                          className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => applySkillsAction((current) => current.filter((_, idx) => idx !== i))}
                          aria-label="Delete skill block"
                          title="Delete block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {section.items.map((skill, skillIndex) => (
                          <span key={`${i}-${skillIndex}`} className="inline-flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              <span
                                data-about-edit={`technicalSkills.${i}.items.${skillIndex}`}
                                className="rounded px-0.5 outline-none"
                                contentEditable={isEditor}
                                suppressContentEditableWarning
                                onBlur={(event) => {
                                  const nextValue = (event.currentTarget.textContent ?? "").trim();
                                  setSkills((current) =>
                                    current.map((item, idx) =>
                                      idx === i
                                        ? {
                                            ...item,
                                            items: item.items.map((entry, idx2) =>
                                              idx2 === skillIndex ? (nextValue || "New skill") : entry
                                            ),
                                          }
                                        : item
                                    )
                                  );
                                }}
                              >
                                {skill}
                              </span>
                            </Badge>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                applySkillsAction((current) =>
                                  current.map((item, idx) =>
                                    idx === i
                                      ? { ...item, items: item.items.filter((_, idx2) => idx2 !== skillIndex) }
                                      : item
                                  )
                                )
                              }
                              aria-label="Delete skill item"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          className="inline-flex h-6 items-center rounded border border-dashed border-border px-2 text-xs text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                          onClick={() =>
                            applySkillsAction((current) => {
                              const next = current.map((item, idx) =>
                                idx === i ? { ...item, items: [...item.items, "New skill"] } : item
                              );
                              const newSkillIndex = next[i]?.items.length ? next[i].items.length - 1 : 0;
                              pendingSkillFocusRef.current = { blockIndex: i, skillIndex: newSkillIndex };
                              return next;
                            })
                          }
                          aria-label="Add skill"
                          title="Add skill"
                        >
                          + Skill
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-1 text-sm font-semibold text-foreground">{section.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {isEditor && i === skills.length - 1 && (
                  <div className="mt-2">
                    <AddBlockButton
                      label="Insert skills block"
                      onClick={() =>
                        applySkillsAction((current) => {
                          const next = [...current];
                          next.splice(i + 1, 0, { category: "New skill group", items: ["New skill"] });
                          return next;
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {showAchievements && (
      <Card className="shadow-[var(--elevation-2)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Award className="h-5 w-5" />
            {isEditor ? (
              <span
                data-about-edit="sectionTitles.achievements"
                className="rounded px-1"
              >
                {sectionTitles.achievements}
              </span>
            ) : (
              sectionTitles.achievements
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={ACHIEVEMENTS_SECTION_GAP_CLASS}>
            {achievements.map((a, i) => (
              <div key={`${a.title}-${i}`}>
                <div
                  className={`${BLOCK_CONTAINER_CLASS} ${
                    dragAchievementOver === i
                      ? "border border-muted-foreground/40 bg-muted"
                      : isEditor
                        ? "border border-border/60"
                        : "border-0"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragAchievementFrom !== null) setDragAchievementOver(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragAchievementFrom === null) return;
                    applyAchievementsAction((current) => move(current, dragAchievementFrom, i));
                    setDragAchievementFrom(null);
                    setDragAchievementOver(null);
                  }}
                >
                  {isEditor ? (
                    <>
                      <div className={`${BLOCK_HEADER_MARGIN_CLASS} flex items-start gap-2`}>
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDragAchievementFrom(i)}
                          onDragEnd={() => {
                            setDragAchievementFrom(null);
                            setDragAchievementOver(null);
                          }}
                          className="mt-1 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground active:cursor-grabbing"
                          aria-label="Drag to reorder achievement block"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                            <p
                              className="text-sm font-medium leading-snug text-foreground rounded px-1"
                              data-about-edit={`achievements.${i}.title`}
                            >
                              {a.title}
                            </p>
                            <div className="flex items-center gap-1">
                              <p
                                className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                data-about-edit={`achievements.${i}.year`}
                              >
                                {a.year}
                              </p>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => applyAchievementsAction((current) => current.filter((_, idx) => idx !== i))}
                                aria-label="Delete achievement block"
                                title="Delete block"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p
                            className="mt-0.5 text-xs leading-snug text-muted-foreground rounded px-1"
                            data-about-edit={`achievements.${i}.organization`}
                          >
                            {trimRepeatedAchievementYear(a.organization, a.year)}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                        <p className="text-sm font-medium leading-snug text-foreground">{a.title}</p>
                        {a.year && (
                          <p className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {a.year}
                          </p>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {trimRepeatedAchievementYear(a.organization, a.year)}
                      </p>
                    </>
                  )}
                </div>
                {isEditor && i === achievements.length - 1 && (
                  <div className="mt-2">
                    <AddBlockButton
                      label="Insert achievement block"
                      onClick={() =>
                        applyAchievementsAction((current) => {
                          const next = [...current];
                          next.splice(i + 1, 0, { title: "New achievement", organization: "", year: "" });
                          return next;
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}
    </>
  );
}
