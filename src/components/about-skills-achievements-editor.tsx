"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Award, GripVertical, Network, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function AboutSkillsAchievementsEditor({
  initialSkills,
  initialAchievements,
  initialSectionTitles,
}: {
  initialSkills: SkillBlock[];
  initialAchievements: AchievementBlock[];
  initialSectionTitles: SectionTitles;
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

  const move = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

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
      className="group flex w-full items-center gap-3 py-1 text-slate-500 transition-colors hover:text-slate-900"
      aria-label={label}
    >
      <span className="h-px flex-1 border-t border-dashed border-slate-300 transition-colors group-hover:border-slate-500" />
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white transition-colors group-hover:border-slate-500">
        <Plus className="h-4 w-4" />
      </span>
      <span className="h-px flex-1 border-t border-dashed border-slate-300 transition-colors group-hover:border-slate-500" />
    </button>
  );

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
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
          <div className="space-y-4">
            {isEditor && (
              <AddBlockButton
                label="Insert skills block"
                onClick={() =>
                  setSkills((current) => [{ category: "New skill group", items: ["New skill"] }, ...current])
                }
              />
            )}
            {skills.map((section, i) => (
              <div key={`${section.category}-${i}`}>
                <div
                  className={`rounded-md border p-3 transition-colors ${
                    dragSkillOver === i ? "border-slate-400 bg-slate-50" : "border-slate-100"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragSkillFrom !== null) setDragSkillOver(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragSkillFrom === null) return;
                    setSkills((current) => move(current, dragSkillFrom, i));
                    setDragSkillFrom(null);
                    setDragSkillOver(null);
                  }}
                >
                  {isEditor ? (
                    <>
                      <div className="mb-2 flex items-start gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDragSkillFrom(i)}
                          onDragEnd={() => {
                            setDragSkillFrom(null);
                            setDragSkillOver(null);
                          }}
                          className="mt-1 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-slate-200 text-slate-500 hover:text-slate-800 active:cursor-grabbing"
                          aria-label="Drag to reorder skill block"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <h3
                          className="mt-1 mb-2 text-sm font-semibold text-slate-800 rounded px-1"
                          data-about-edit={`technicalSkills.${i}.category`}
                        >
                          {section.category}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {section.items.map((skill, skillIndex) => (
                          <span key={`${i}-${skillIndex}`} className="inline-flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              <span data-about-edit={`technicalSkills.${i}.items.${skillIndex}`} className="rounded px-0.5">
                                {skill}
                              </span>
                            </Badge>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-slate-500 hover:text-slate-800"
                              onClick={() =>
                                setSkills((current) =>
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
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSkills((current) =>
                              current.map((item, idx) =>
                                idx === i ? { ...item, items: [...item.items, "New skill"] } : item
                              )
                            )
                          }
                        >
                          + Skill
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSkills((current) => current.filter((_, idx) => idx !== i))}>Delete block</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-2 text-sm font-semibold text-slate-800">{section.category}</h3>
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
                {isEditor && (
                  <div className="mt-3">
                    <AddBlockButton
                      label="Insert skills block"
                      onClick={() =>
                        setSkills((current) => {
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
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
          <div className="space-y-3">
            {isEditor && (
              <AddBlockButton
                label="Insert achievement block"
                onClick={() =>
                  setAchievements((current) => [{ title: "New achievement", organization: "", year: "" }, ...current])
                }
              />
            )}
            {achievements.map((a, i) => (
              <div key={`${a.title}-${i}`}>
                <div
                  className={`rounded-md border p-3 transition-colors ${
                    dragAchievementOver === i ? "border-slate-400 bg-slate-50" : "border-slate-100"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragAchievementFrom !== null) setDragAchievementOver(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragAchievementFrom === null) return;
                    setAchievements((current) => move(current, dragAchievementFrom, i));
                    setDragAchievementFrom(null);
                    setDragAchievementOver(null);
                  }}
                >
                  {isEditor ? (
                    <>
                      <div className="mb-2 flex items-start gap-2">
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDragAchievementFrom(i)}
                          onDragEnd={() => {
                            setDragAchievementFrom(null);
                            setDragAchievementOver(null);
                          }}
                          className="mt-1 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-slate-200 text-slate-500 hover:text-slate-800 active:cursor-grabbing"
                          aria-label="Drag to reorder achievement block"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <p
                          className="text-sm font-medium text-slate-800 rounded px-1"
                          data-about-edit={`achievements.${i}.title`}
                        >
                          {a.title}
                        </p>
                      </div>
                      <p
                        className="text-xs text-slate-500 rounded px-1"
                        data-about-edit={`achievements.${i}.organization`}
                      >
                        {a.organization}
                      </p>
                      <p
                        className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        data-about-edit={`achievements.${i}.year`}
                      >
                        {a.year}
                      </p>
                      <div className="mt-2 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setAchievements((current) => current.filter((_, idx) => idx !== i))}>Delete block</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{a.organization}</p>
                    </>
                  )}
                </div>
                {isEditor && (
                  <div className="mt-3">
                    <AddBlockButton
                      label="Insert achievement block"
                      onClick={() =>
                        setAchievements((current) => {
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
    </>
  );
}
