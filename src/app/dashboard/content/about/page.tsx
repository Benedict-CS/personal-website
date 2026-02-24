"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, XCircle, Trash2, Download, FileText, Trash, ExternalLink, Info, GraduationCap, Briefcase, Code, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/contexts/toast-context";
import { InsertMediaModal } from "@/components/insert-media-modal";
import { FieldHelp } from "@/components/ui/field-help";

interface SchoolLogo {
  school: string;
  logo: string;
}

interface ProjectImage {
  project: string;
  image: string;
}

interface CompanyLogo {
  company: string;
  logo: string;
}

export interface AboutBlockEntry {
  title: string;
  logoUrl?: string | null;
  organization: string;
  /** ISO 3166-1 alpha-2 (e.g. TW, US) for Education; shown as flag after school name */
  countryCode?: string | null;
  dateRange: string;
  content: string;
}

const emptyBlockEntry = (): AboutBlockEntry => ({
  title: "",
  logoUrl: "",
  organization: "",
  countryCode: "",
  dateRange: "",
  content: "",
});

// Defaults shown on About page when DB is empty; pre-fill dashboard so you see and can edit the same content.
const DEFAULT_HERO = {
  name: "Benedict Ing Ngie Tiong",
  tagline: "Master's Student in Computer Science | Full Stack Developer",
};

const DEFAULT_EDUCATION_BLOCKS: AboutBlockEntry[] = [
  {
    title: "M.S. in Computer Science",
    organization: "National Yang Ming Chiao Tung University (NYCU), Taiwan",
    countryCode: "TW",
    dateRange: "Sep 2023 - Jan 2026",
    content: "• **Thesis:** A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks\n• **Research Focus:** Network Function Virtualization (NFV), CI/CD, DevOps, Kubernetes, and Cloud‑Native Technologies\n• **Advisor:** Prof. Chien‑Chao Tseng (Wireless Internet Laboratory, WinLab)",
  },
  {
    title: "B.S. in Interaction Design (Media Design Division)",
    organization: "National Taipei University of Technology (NTUT), Taiwan",
    countryCode: "TW",
    dateRange: "Sep 2019 - Jun 2023",
    content: "• **Award:** Outstanding Overseas Chinese Graduate of the Year, Presidential Award (3 Semesters)\n• **Graduation Project:** A Location‑Based AR System for Urban Exploration and Infrastructure Maintenance\n• **Research Focus:** IoT, Embedded Systems, Full‑Stack Development, AR/VR, Human‑Computer Interaction (HCI)\n• **Advisor:** Prof. Lydia Hsiao‑Mei Lin",
  },
];

const DEFAULT_EXPERIENCE_BLOCKS: AboutBlockEntry[] = [
  { title: "SDN/NFV Teaching Assistant", organization: "Department of Computer Science, NYCU", dateRange: "Jul 2023 - Jan 2024", content: "• Refined labs for ONOS SDN modules to implement L2/L3 protocols, including Learning Bridge, Proxy ARP, and Unicast DHCP\n• Led NFV labs on Docker‑based routing (BGP) and guided final projects on VLAN‑based Segment Routing" },
  { title: "Software Engineer Intern", organization: "IT Department, Makalot Industrial Co., Ltd.", dateRange: "Jul 2022 - Jun 2023", content: "• Developed a Full‑Stack dashboard using Vue.js and ASP.NET Web API to streamline RBAC and system configurations\n• Engineered a Dockerized OAuth 2.0 Authentication Service with JWT and Dapper ORM to secure cross‑platform ERP API access\n• Implemented RPA workflows via Power Automate to trigger Microsoft Teams and Outlook alerts, reducing manual effort" },
  { title: "Unity Software Engineer (Research Assistant)", organization: "Department of Multimedia & Game Development, MUST", dateRange: "Jan 2022 - Jun 2022", content: "• Developed an NSTC project using Unity and C#, engineering a cross‑platform system featuring 5 distinct motion‑sensing games\n• Integrated Google Firebase for real‑time data synchronization to support bilingual (English/Chinese) content and learning analysis" },
  { title: "IT Support (Work‑Study)", organization: "Computer and Network Center, NTUT", dateRange: "Jun 2021 - Jun 2023", content: "• Provided technical support to faculty members, handling PC assembly, OS installation, and troubleshooting campus network issues\n• Participated in the frontend development of the campus Authorized Software Portal, improving the UI/UX to streamline software downloads\n• Maintained lab servers and network infrastructure" },
];

const DEFAULT_PROJECT_BLOCKS: AboutBlockEntry[] = [
  { title: "A CI/CD Framework for Zero Downtime Deployment in Wi‑Fi Mesh Networks", organization: "Master's Thesis / Industry‑Academia Collaboration with Wistron NeWeb Corporation (WNC)", dateRange: "Feb 2025 - Jan 2026", content: "• Integrated GitHub Actions with USP APIs to automate cloud‑to‑edge container delivery to Root AP via TR‑369 (USP) standards\n• Developed a C‑based Controller bridging USP Agent (via UDS) to Extender APs (via TCP) for synchronized mesh updates\n• Engineered Linux iptables steering to achieve zero packet loss and zero downtime during Blue‑Green/Canary deployments" },
  { title: "Kubernetes‑based Multi‑Cluster Hybrid Cloud Management System", organization: "Industry‑Academia Collaboration with Iscom Online International Info. Inc.", dateRange: "Apr 2024 - Sep 2024", content: "• Orchestrated public cloud and on‑premises clusters using Karmada and GitOps (ArgoCD/FluxCD) for automated service propagation\n• Implemented Cilium Cluster Mesh and HAProxy to enable global traffic steering, cross‑cluster failover, and firewall security policies\n• Engineered a unified observability stack integrating Thanos, Prometheus, and Grafana for centralized health monitoring" },
];

type TechnicalSkillSection = { category: string; items: string[] };
type AchievementEntry = { title: string; organization: string; year: string };

const DEFAULT_TECHNICAL_SKILLS: TechnicalSkillSection[] = [
  { category: "Cloud Native & K8s", items: ["Kubernetes (K8s)", "Docker", "Helm", "Cilium (Service Mesh)", "Karmada", "Harbor", "Linux Containers (LXC)"] },
  { category: "CI/CD & GitOps", items: ["Jenkins", "GitLab CI/CD", "GitHub Actions", "ArgoCD", "Flux CD", "GitOps Workflow", "Git"] },
  { category: "Observability", items: ["Prometheus", "Grafana", "Thanos", "Monitoring & Logging"] },
  { category: "Infrastructure & Networking", items: ["Google Cloud Platform (GCP)", "Proxmox VE", "Ansible", "Linux Networking", "SSL/TLS Management"] },
];

const DEFAULT_ACHIEVEMENTS: AchievementEntry[] = [
  { title: "National Makerthon: Good Health and Well‑Being - 1st Place", organization: "Ministry of Education 2022", year: "2022" },
  { title: "Vision Get Wild XR Social Welfare Potential Award", organization: "Meta XR Hub Taiwan 2023", year: "2023" },
  { title: "Intel® DevCup x OpenVINO™ Toolkit Competition - Shortlisted", organization: "Intel Corporation 2021", year: "2021" },
  { title: "5G Mobileheroes - Shortlisted", organization: "Industrial Development Administration 2021", year: "2021" },
];

type AboutSavedSnapshot = {
  hero: { heroName: string; heroTagline: string };
  intro: string;
  education: AboutBlockEntry[];
  experience: AboutBlockEntry[];
  projects: AboutBlockEntry[];
  technicalSkills: TechnicalSkillSection[];
  achievements: AchievementEntry[];
  aboutMainContent: string;
};

function buildSnapshotFromConfig(config: Record<string, unknown>): AboutSavedSnapshot {
  const edu = Array.isArray(config.educationBlocks) ? config.educationBlocks as AboutBlockEntry[] : [];
  const exp = Array.isArray(config.experienceBlocks) ? config.experienceBlocks as AboutBlockEntry[] : [];
  const proj = Array.isArray(config.projectBlocks) ? config.projectBlocks as AboutBlockEntry[] : [];
  return {
    hero: {
      heroName: typeof config.heroName === "string" && config.heroName.trim() ? config.heroName : DEFAULT_HERO.name,
      heroTagline: typeof config.heroTagline === "string" && config.heroTagline.trim() ? config.heroTagline : DEFAULT_HERO.tagline,
    },
    intro: typeof config.introText === "string" ? config.introText : "",
    education: edu.length > 0 ? edu : DEFAULT_EDUCATION_BLOCKS,
    experience: exp.length > 0 ? exp : DEFAULT_EXPERIENCE_BLOCKS,
    projects: proj.length > 0 ? proj : DEFAULT_PROJECT_BLOCKS,
    technicalSkills: Array.isArray(config.technicalSkills) && config.technicalSkills.length > 0 ? config.technicalSkills as TechnicalSkillSection[] : DEFAULT_TECHNICAL_SKILLS,
    achievements: Array.isArray(config.achievements) && config.achievements.length > 0 ? config.achievements as AchievementEntry[] : DEFAULT_ACHIEVEMENTS,
    aboutMainContent: typeof config.aboutMainContent === "string" ? config.aboutMainContent : "",
  };
}

export default function AboutPage() {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [heroName, setHeroName] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [introText, setIntroText] = useState("");
  const [aboutMainContent, setAboutMainContent] = useState("");
  const [educationBlocks, setEducationBlocks] = useState<AboutBlockEntry[]>([]);
  const [experienceBlocks, setExperienceBlocks] = useState<AboutBlockEntry[]>([]);
  const [projectBlocks, setProjectBlocks] = useState<AboutBlockEntry[]>([]);
  const [schoolLogos, setSchoolLogos] = useState<SchoolLogo[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [companyLogos, setCompanyLogos] = useState<CompanyLogo[]>([]);
  const [technicalSkills, setTechnicalSkills] = useState<TechnicalSkillSection[]>(DEFAULT_TECHNICAL_SKILLS);
  const [achievements, setAchievements] = useState<AchievementEntry[]>(DEFAULT_ACHIEVEMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvExists, setCvExists] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [savingIntro, setSavingIntro] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [mediaPickerTarget, setMediaPickerTarget] = useState<{ block: "education" | "experience"; index: number } | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<AboutSavedSnapshot | null>(null);

  // 載入配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/about/config");
        if (response.ok) {
          const config = await response.json();
          setLastSavedSnapshot(buildSnapshotFromConfig(config));
          setProfileImage(config.profileImage ?? null);
          // Pre-fill hero with site defaults when DB has no values (so dashboard matches what visitors see)
          setHeroName(typeof config.heroName === "string" && config.heroName.trim() ? config.heroName : DEFAULT_HERO.name);
          setHeroTagline(typeof config.heroTagline === "string" && config.heroTagline.trim() ? config.heroTagline : DEFAULT_HERO.tagline);
          setIntroText(typeof config.introText === "string" ? config.introText : "");
          setAboutMainContent(typeof config.aboutMainContent === "string" ? config.aboutMainContent : "");
          // Pre-fill Education/Experience/Projects with same content as site fallback when DB has no entries
          const edu = Array.isArray(config.educationBlocks) ? config.educationBlocks : [];
          const exp = Array.isArray(config.experienceBlocks) ? config.experienceBlocks : [];
          const proj = Array.isArray(config.projectBlocks) ? config.projectBlocks : [];
          setEducationBlocks(edu.length > 0 ? edu : DEFAULT_EDUCATION_BLOCKS);
          setExperienceBlocks(exp.length > 0 ? exp : DEFAULT_EXPERIENCE_BLOCKS);
          setProjectBlocks(proj.length > 0 ? proj : DEFAULT_PROJECT_BLOCKS);
          setSchoolLogos(Array.isArray(config.schoolLogos) ? config.schoolLogos : []);
          setProjectImages(Array.isArray(config.projectImages) ? config.projectImages : []);
          setCompanyLogos(Array.isArray(config.companyLogos) ? config.companyLogos : []);
          setTechnicalSkills(Array.isArray(config.technicalSkills) && config.technicalSkills.length > 0 ? config.technicalSkills : DEFAULT_TECHNICAL_SKILLS);
          setAchievements(Array.isArray(config.achievements) && config.achievements.length > 0 ? config.achievements : DEFAULT_ACHIEVEMENTS);
        } else {
          setTechnicalSkills(DEFAULT_TECHNICAL_SKILLS);
          setAchievements(DEFAULT_ACHIEVEMENTS);
        }
      } catch (error) {
        console.error("Error loading config:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
    
    // 檢查 CV 是否存在
    const checkCVExists = async () => {
      try {
        const response = await fetch("/api/media/serve/cv.pdf", { method: "HEAD" });
        setCvExists(response.ok);
      } catch {
        setCvExists(false);
      }
    };
    checkCVExists();
  }, []);

  // Upload file (profile only; school/project/company logos edited per entry in blocks 3a/3b/3c)
  const handleUpload = async (type: "profile", file: File) => {
    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/about/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to upload file");
      }

      try {
        await updateConfig({ profileImage: data.url });
        setUploadStatus({
          type: "success",
          message: "File uploaded and saved successfully! The about page will update on next refresh.",
        });
        toast("File uploaded and saved.", "success");
      } catch (configError) {
        throw new Error(`Upload succeeded but failed to save config: ${configError instanceof Error ? configError.message : "Unknown error"}`);
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to upload file",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 更新配置
  const updateConfig = async (updates: {
    profileImage?: string | null;
    heroName?: string | null;
    heroTagline?: string | null;
    introText?: string | null;
    aboutMainContent?: string | null;
    educationBlocks?: AboutBlockEntry[];
    experienceBlocks?: AboutBlockEntry[];
    projectBlocks?: AboutBlockEntry[];
    schoolLogos?: SchoolLogo[];
    projectImages?: ProjectImage[];
    companyLogos?: CompanyLogo[];
    technicalSkills?: TechnicalSkillSection[];
    achievements?: AchievementEntry[];
  }) => {
    try {
      const response = await fetch("/api/about/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || "Failed to update config");
      }

      const updated = await response.json();
      console.log("Config updated:", updated);
      
      // 確保本地狀態與服務器同步
      if (updated.profileImage !== undefined) {
        setProfileImage(updated.profileImage);
      }
      if (updated.heroName !== undefined) {
        setHeroName(updated.heroName ?? "");
      }
      if (updated.heroTagline !== undefined) {
        setHeroTagline(updated.heroTagline ?? "");
      }
      if (updated.introText !== undefined) {
        setIntroText(updated.introText ?? "");
      }
      if (updated.aboutMainContent !== undefined) {
        setAboutMainContent(updated.aboutMainContent ?? "");
      }
      if (updated.educationBlocks) setEducationBlocks(updated.educationBlocks);
      if (updated.experienceBlocks) setExperienceBlocks(updated.experienceBlocks);
      if (updated.projectBlocks) setProjectBlocks(updated.projectBlocks);
      if (updated.schoolLogos) {
        setSchoolLogos(updated.schoolLogos);
      }
      if (updated.projectImages) {
        setProjectImages(updated.projectImages);
      }
      if (updated.companyLogos) {
        setCompanyLogos(updated.companyLogos);
      }
      if (updated.technicalSkills) setTechnicalSkills(updated.technicalSkills);
      if (updated.achievements) setAchievements(updated.achievements);
      
      return updated;
    } catch (error) {
      console.error("Error updating config:", error);
      throw error; // 重新拋出錯誤以便上層處理
    }
  };

  // 上傳 CV
  const handleCVUpload = async () => {
    if (!cvFile) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first",
      });
      return;
    }

    if (cvFile.type !== "application/pdf") {
      setUploadStatus({
        type: "error",
        message: "Please select a PDF file",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", cvFile);

      const response = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload CV");
      }

      setUploadStatus({
        type: "success",
        message: "CV uploaded successfully!",
      });
      setCvFile(null);
      setCvExists(true);
      
      // 重置 file input
      const fileInput = document.getElementById("cv-file") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to upload CV",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 清理未使用的圖片
  const handleCleanup = async () => {
    if (!confirm("Are you sure you want to clean up unused images? This action cannot be undone.")) {
      return;
    }

    setIsCleaning(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/about/cleanup", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cleanup unused images");
      }

      setUploadStatus({
        type: "success",
        message: `Successfully cleaned up ${data.deletedCount} unused image file${data.deletedCount !== 1 ? "s" : ""}`,
      });
      toast(`Cleaned up ${data.deletedCount} unused image(s).`, "success");
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to cleanup",
      });
      toast(error instanceof Error ? error.message : "Failed to cleanup", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  const saveHero = async () => {
    setSavingHero(true);
    try {
      await updateConfig({
        heroName: heroName.trim() || null,
        heroTagline: heroTagline.trim() || null,
        introText: introText || null,
      });
      setLastSavedSnapshot((prev) => prev ? { ...prev, hero: { heroName, heroTagline }, intro: introText } : null);
      setUploadStatus({ type: "success", message: "Profile card and intro saved." });
      toast("Profile card saved.", "success");
    } catch {
      setUploadStatus({ type: "error", message: "Failed to save." });
      toast("Failed to save.", "error");
    } finally {
      setSavingHero(false);
    }
  };

  const [savingSkills, setSavingSkills] = useState(false);
  const [savingAchievements, setSavingAchievements] = useState(false);

  const saveTechnicalSkills = async () => {
    setSavingSkills(true);
    try {
      await updateConfig({ technicalSkills });
      setLastSavedSnapshot((prev) => prev ? { ...prev, technicalSkills } : null);
      toast("Technical Skills saved.", "success");
    } catch {
      toast("Failed to save Technical Skills.", "error");
    } finally {
      setSavingSkills(false);
    }
  };

  const saveAchievements = async () => {
    setSavingAchievements(true);
    try {
      await updateConfig({ achievements });
      setLastSavedSnapshot((prev) => prev ? { ...prev, achievements } : null);
      toast("Achievements saved.", "success");
    } catch {
      toast("Failed to save Achievements.", "error");
    } finally {
      setSavingAchievements(false);
    }
  };

  const saveMainContent = async () => {
    setSavingIntro(true);
    try {
      await updateConfig({ aboutMainContent: aboutMainContent || null });
      setLastSavedSnapshot((prev) => prev ? { ...prev, aboutMainContent } : null);
      setUploadStatus({ type: "success", message: "Main content saved." });
      toast("Main content saved.", "success");
    } catch {
      setUploadStatus({ type: "error", message: "Failed to save." });
      toast("Failed to save.", "error");
    } finally {
      setSavingIntro(false);
    }
  };

  // Unsaved changes per section (compare current state to last saved snapshot)
  const isDirtyHero = lastSavedSnapshot != null && (JSON.stringify({ heroName, heroTagline }) !== JSON.stringify(lastSavedSnapshot.hero) || JSON.stringify(introText) !== JSON.stringify(lastSavedSnapshot.intro));
  const isDirtyEducation = lastSavedSnapshot != null && JSON.stringify(educationBlocks) !== JSON.stringify(lastSavedSnapshot.education);
  const isDirtyExperience = lastSavedSnapshot != null && JSON.stringify(experienceBlocks) !== JSON.stringify(lastSavedSnapshot.experience);
  const isDirtyProjects = lastSavedSnapshot != null && JSON.stringify(projectBlocks) !== JSON.stringify(lastSavedSnapshot.projects);
  const isDirtySkills = lastSavedSnapshot != null && JSON.stringify(technicalSkills) !== JSON.stringify(lastSavedSnapshot.technicalSkills);
  const isDirtyAchievements = lastSavedSnapshot != null && JSON.stringify(achievements) !== JSON.stringify(lastSavedSnapshot.achievements);
  const isDirtyMainContent = lastSavedSnapshot != null && JSON.stringify(aboutMainContent) !== JSON.stringify(lastSavedSnapshot.aboutMainContent);
  const hasAnyUnsaved = isDirtyHero || isDirtyEducation || isDirtyExperience || isDirtyProjects || isDirtySkills || isDirtyAchievements || isDirtyMainContent;

  const BlockHint = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
      <Info className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold text-slate-900">Edit About Page</h2>
        <div className="flex items-center gap-2">
          <Link href="/about" target="_blank" prefetch={false}>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View on site
            </Button>
          </Link>
          {!isLoading && (
            <Button
              variant="outline"
              onClick={handleCleanup}
              disabled={isCleaning}
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              {isCleaning ? "Cleaning..." : "Clean up images"}
            </Button>
          )}
        </div>
      </div>

      <p className="text-slate-600 text-sm">
        Blocks below match the order on the public About page. Edit each block and save. If the form is pre-filled with the same content as the site, click Save to store it in the database.
      </p>

      {uploadStatus.type && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            uploadStatus.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {uploadStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{uploadStatus.message}</span>
        </div>
      )}

      {!isLoading && hasAnyUnsaved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
          <Info className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">部分區塊有未儲存的變更，請記得按該區塊的儲存按鈕。</span>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          {!isLoading && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 text-slate-700 p-3 text-sm">
              Hero and entries are either loaded from the database or pre-filled to match the current About page. Edit any field and click the corresponding Save button to store changes.
            </div>
          )}
          {/* Hero: profile card on About page (photo, name, tagline, contact, CV) — first thing visitors see */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Hero</span>
                <CardTitle className="text-xl">Profile card (name, tagline, intro, CV)</CardTitle>
              </div>
              <BlockHint>Top of About page: photo, name, subtitle, intro/bio text, Download CV. Contact info is on the Contact page and footer.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start gap-6">
                {profileImage && (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-300 ring-2 ring-slate-100 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await handleUpload("profile", file);
                    if (e.target) (e.target as HTMLInputElement).value = "";
                  }}
                  className="cursor-pointer max-w-xs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-1">
                <div>
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <Input
                    value={heroName}
                    onChange={(e) => setHeroName(e.target.value)}
                    placeholder="e.g. Benedict Ing Ngie Tiong"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Tagline (subtitle under name)</label>
                  <Input
                    value={heroTagline}
                    onChange={(e) => setHeroTagline(e.target.value)}
                    placeholder="e.g. Master's Student in Computer Science | Full Stack Developer"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Intro / Bio (short paragraph below name on About page; leave empty to hide)</label>
                  <Textarea
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder="Short intro or bio..."
                    rows={4}
                    className="mt-1 resize-y"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button onClick={saveHero} disabled={savingHero}>
                    {savingHero ? "Saving..." : "Save profile card"}
                  </Button>
                  {isDirtyHero && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
                  <span className="text-sm text-slate-500">CV: upload below (same section).</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">CV (PDF)</p>
                {cvExists ? (
                  <p className="text-sm text-slate-600 mb-2">A CV file is already on the site. Upload a new file to replace it.</p>
                ) : (
                  <p className="text-sm text-slate-600 mb-2">No CV uploaded yet. The &quot;Download CV&quot; button will appear on the About page after you upload.</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                    className="cursor-pointer max-w-xs"
                  />
                  <Button onClick={handleCVUpload} disabled={!cvFile || isUploading} className="gap-2">
                    {isUploading ? "Uploading..." : "Upload CV"}
                  </Button>
                  {cvExists && (
                    <Link href="/api/cv/download" target="_blank" prefetch={false}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Preview
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 3a: Education — same layout as About page, editable in place (LinkedIn-style) */}
          <Card className="shadow-lg border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="h-5 w-5" />
                Education
              </CardTitle>
              <p className="text-sm text-slate-500">
                {educationBlocks.length > 0
                  ? `${educationBlocks.length} entry/entries. Use ↑ ↓ to reorder (e.g. most recent first), edit any field, then Save Education.`
                  : "Same as About page. Add entries below, or edit existing ones after they are saved."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {educationBlocks.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">No education entries yet. Add one with the button below.</p>
                )}
                {educationBlocks.map((entry, index) => {
                  const fallbackLogo = schoolLogos.length > 0 && entry.organization ? schoolLogos.find(l => entry.organization.toLowerCase().includes(l.school.toLowerCase()))?.logo : null;
                  const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : fallbackLogo);
                  return (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 relative">
                      <div className="absolute top-0 right-0 flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...educationBlocks]; const [rem] = u.splice(index, 1); u.splice(index - 1, 0, rem); setEducationBlocks(u); }} disabled={index === 0} title="Move up">
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...educationBlocks]; const [rem] = u.splice(index, 1); u.splice(index + 1, 0, rem); setEducationBlocks(u); }} disabled={index === educationBlocks.length - 1} title="Move down">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => { const u = educationBlocks.filter((_, i) => i !== index); setEducationBlocks(u); }} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 mt-1">
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget({ block: "education", index })}
                            className="block w-full h-full rounded border-2 border-dashed border-slate-200 hover:border-slate-400 focus:border-slate-500 overflow-hidden bg-slate-50 focus:outline-none"
                          >
                            {entryLogo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={entryLogo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-slate-400 text-xs">+ Logo</span>
                            )}
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`edu-logo-${index}`}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const name = (entry.organization || entry.title || `entry-${index + 1}`).trim().replace(/[^a-zA-Z0-9\s-]/g, " ").slice(0, 30) || `entry-${index + 1}`;
                              const fd = new FormData();
                              fd.append("file", file);
                              fd.append("type", "school");
                              fd.append("name", name);
                              try {
                                const res = await fetch("/api/about/upload", { method: "POST", body: fd });
                                const data = await res.json();
                                if (res.ok && data.url) {
                                  const u = [...educationBlocks];
                                  u[index] = { ...u[index], logoUrl: data.url };
                                  setEducationBlocks(u);
                                } else {
                                  setUploadStatus({ type: "error", message: data.error || "Upload failed" });
                                }
                              } catch {
                                setUploadStatus({ type: "error", message: "Upload failed" });
                              }
                              if (e.target) (e.target as HTMLInputElement).value = "";
                            }}
                          />
                          <div className="absolute -bottom-6 left-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById(`edu-logo-${index}`)?.click()}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Upload
                            </button>
                            {entryLogo && (
                              <button
                                type="button"
                                onClick={() => { const u = [...educationBlocks]; u[index] = { ...u[index], logoUrl: "" }; setEducationBlocks(u); }}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Remove logo
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Title (e.g. M.S. in Computer Science)"
                            value={entry.title ?? ""}
                            onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], title: e.target.value }; setEducationBlocks(u); }}
                            className="font-semibold text-slate-900 text-lg border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 h-auto py-0 shadow-none w-full mb-1"
                          />
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Input
                              placeholder="School / Organization"
                              value={entry.organization ?? ""}
                              onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], organization: e.target.value }; setEducationBlocks(u); }}
                              className="text-sm text-slate-600 font-medium border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 flex-1 min-w-0 shadow-none"
                            />
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Input
                                placeholder="Country (e.g. TW, US)"
                                value={entry.countryCode ?? ""}
                                onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], countryCode: e.target.value.trim().toUpperCase().slice(0, 2) || "" }; setEducationBlocks(u); }}
                                className="w-16 text-sm rounded-md border-slate-200 bg-slate-50"
                                maxLength={2}
                                title="ISO 3166-1 alpha-2 (2 letters); shown as flag on site"
                              />
                              <FieldHelp text="Two-letter country code (e.g. TW, US). Shown as a flag next to the school name on your About page." />
                            </span>
                            <Input
                              placeholder="Date range"
                              value={entry.dateRange ?? ""}
                              onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setEducationBlocks(u); }}
                              className="flex-shrink-0 w-full sm:w-[180px] text-sm rounded-md border-slate-200 bg-slate-100"
                            />
                          </div>
                          <Textarea
                            placeholder="Content (Markdown OK)"
                            value={entry.content ?? ""}
                            onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], content: e.target.value }; setEducationBlocks(u); }}
                            rows={5}
                            className="prose prose-slate prose-sm max-w-none text-sm border border-slate-200 rounded-md resize-y"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Button variant="outline" onClick={() => setEducationBlocks([...educationBlocks, emptyBlockEntry()])}>
                  + Add Education entry
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ educationBlocks }); setLastSavedSnapshot((prev) => prev ? { ...prev, education: educationBlocks } : null); setUploadStatus({ type: "success", message: "Education saved." }); toast("Education saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>
                    {savingIntro ? "Saving..." : "Save Education"}
                  </Button>
                  {isDirtyEducation && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 3b: Experience — same layout as About page, editable in place */}
          <Card className="shadow-lg border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Briefcase className="h-5 w-5" />
                Experience
              </CardTitle>
              <p className="text-sm text-slate-500">
                {experienceBlocks.length > 0 ? `${experienceBlocks.length} entry/entries from the site. Click any field to edit, then Save Experience.` : "Add entries below; existing ones load here and are editable."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {experienceBlocks.length === 0 && <p className="text-sm text-slate-500 py-2">No experience entries yet. Add one below.</p>}
                {experienceBlocks.map((entry, index) => {
                  const fallbackLogo = companyLogos.length > 0 && entry.organization ? companyLogos.find(c => entry.organization.toLowerCase().includes(c.company.toLowerCase()))?.logo : null;
                  const entryLogo = (entry.logoUrl && entry.logoUrl.trim()) ? entry.logoUrl : (entry.logoUrl === "" ? null : fallbackLogo);
                  return (
                    <div key={index} className="border-l-4 border-green-500 pl-4 relative">
                      <div className="absolute top-0 right-0 flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...experienceBlocks]; const [rem] = u.splice(index, 1); u.splice(index - 1, 0, rem); setExperienceBlocks(u); }} disabled={index === 0} title="Move up"><ChevronUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...experienceBlocks]; const [rem] = u.splice(index, 1); u.splice(index + 1, 0, rem); setExperienceBlocks(u); }} disabled={index === experienceBlocks.length - 1} title="Move down"><ChevronDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => { const u = experienceBlocks.filter((_, i) => i !== index); setExperienceBlocks(u); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 mt-1">
                          <button
                            type="button"
                            onClick={() => setMediaPickerTarget({ block: "experience", index })}
                            className="block w-full h-full rounded border-2 border-dashed border-slate-200 hover:border-slate-400 focus:border-slate-500 overflow-hidden bg-slate-50 focus:outline-none"
                          >
                            {entryLogo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={entryLogo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-slate-400 text-xs">+ Logo</span>
                            )}
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`exp-logo-${index}`}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const name = (entry.organization || entry.title || `entry-${index + 1}`).trim().replace(/[^a-zA-Z0-9\s-]/g, " ").slice(0, 30) || `entry-${index + 1}`;
                              const fd = new FormData();
                              fd.append("file", file);
                              fd.append("type", "company");
                              fd.append("name", name);
                              try {
                                const res = await fetch("/api/about/upload", { method: "POST", body: fd });
                                const data = await res.json();
                                if (res.ok && data.url) {
                                  const u = [...experienceBlocks];
                                  u[index] = { ...u[index], logoUrl: data.url };
                                  setExperienceBlocks(u);
                                } else {
                                  setUploadStatus({ type: "error", message: data.error || "Upload failed" });
                                }
                              } catch {
                                setUploadStatus({ type: "error", message: "Upload failed" });
                              }
                              if (e.target) (e.target as HTMLInputElement).value = "";
                            }}
                          />
                          <div className="absolute -bottom-6 left-0 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => document.getElementById(`exp-logo-${index}`)?.click()}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Upload
                            </button>
                            {entryLogo && (
                              <button
                                type="button"
                                onClick={() => { const u = [...experienceBlocks]; u[index] = { ...u[index], logoUrl: "" }; setExperienceBlocks(u); }}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Remove logo
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input placeholder="Title" value={entry.title ?? ""} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], title: e.target.value }; setExperienceBlocks(u); }} className="font-semibold text-slate-900 text-lg border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 h-auto py-0 shadow-none w-full mb-1" />
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Input placeholder="Company / Organization" value={entry.organization ?? ""} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], organization: e.target.value }; setExperienceBlocks(u); }} className="text-sm text-slate-600 font-medium border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 flex-1 min-w-0 shadow-none" />
                            <Input placeholder="Date range" value={entry.dateRange ?? ""} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setExperienceBlocks(u); }} className="flex-shrink-0 w-full sm:w-[180px] text-sm rounded-md border-slate-200 bg-slate-100" />
                          </div>
                          <Textarea placeholder="Content (Markdown)" value={entry.content ?? ""} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], content: e.target.value }; setExperienceBlocks(u); }} rows={5} className="prose prose-slate prose-sm max-w-none text-sm border border-slate-200 rounded-md resize-y" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Button variant="outline" onClick={() => setExperienceBlocks([...experienceBlocks, emptyBlockEntry()])}>+ Add Experience entry</Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ experienceBlocks }); setLastSavedSnapshot((prev) => prev ? { ...prev, experience: experienceBlocks } : null); setUploadStatus({ type: "success", message: "Experience saved." }); toast("Experience saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>{savingIntro ? "Saving..." : "Save Experience"}</Button>
                  {isDirtyExperience && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Block 3c: Projects — same layout as About page, editable in place */}
          <Card className="shadow-lg border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Code className="h-5 w-5" />
                Projects
              </CardTitle>
              <p className="text-sm text-slate-500">
                {projectBlocks.length > 0 ? `${projectBlocks.length} entry/entries from the site. Click any field to edit, then Save Projects.` : "Add entries below; existing ones load here and are editable."}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projectBlocks.length === 0 && <p className="text-sm text-slate-500 py-2">No project entries yet. Add one below.</p>}
                {projectBlocks.map((entry, index) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4 relative">
                      <div className="absolute top-0 right-0 flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...projectBlocks]; const [rem] = u.splice(index, 1); u.splice(index - 1, 0, rem); setProjectBlocks(u); }} disabled={index === 0} title="Move up"><ChevronUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700" onClick={() => { const u = [...projectBlocks]; const [rem] = u.splice(index, 1); u.splice(index + 1, 0, rem); setProjectBlocks(u); }} disabled={index === projectBlocks.length - 1} title="Move down"><ChevronDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => { const u = projectBlocks.filter((_, i) => i !== index); setProjectBlocks(u); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input placeholder="Project title" value={entry.title ?? ""} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], title: e.target.value }; setProjectBlocks(u); }} className="font-semibold text-slate-900 text-lg border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 h-auto py-0 shadow-none w-full mb-1" />
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Input placeholder="Organization (optional)" value={entry.organization ?? ""} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], organization: e.target.value }; setProjectBlocks(u); }} className="text-sm text-slate-600 border border-transparent hover:border-slate-200 focus:border-slate-400 focus:bg-slate-50/50 rounded px-1 -mx-1 flex-1 min-w-0 shadow-none" />
                          <Input placeholder="Date range" value={entry.dateRange ?? ""} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setProjectBlocks(u); }} className="flex-shrink-0 w-full sm:w-[180px] text-sm rounded-md border-slate-200 bg-slate-100" />
                        </div>
                        <Textarea placeholder="Content (Markdown)" value={entry.content ?? ""} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], content: e.target.value }; setProjectBlocks(u); }} rows={5} className="prose prose-slate prose-sm max-w-none text-sm border border-slate-200 rounded-md resize-y" />
                      </div>
                    </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Button variant="outline" onClick={() => setProjectBlocks([...projectBlocks, emptyBlockEntry()])}>+ Add Project entry</Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ projectBlocks }); setLastSavedSnapshot((prev) => prev ? { ...prev, projects: projectBlocks } : null); setUploadStatus({ type: "success", message: "Projects saved." }); toast("Projects saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>{savingIntro ? "Saving..." : "Save Projects"}</Button>
                  {isDirtyProjects && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Skills — same as About page */}
          <Card className="border-l-4 border-l-sky-500">
            <CardHeader>
              <CardTitle className="text-xl">Technical Skills</CardTitle>
              <BlockHint>Categories and skill tags shown on the About page.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              {technicalSkills.map((section, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <Input value={section.category} onChange={(e) => { const u = [...technicalSkills]; u[i] = { ...u[i], category: e.target.value }; setTechnicalSkills(u); }} placeholder="Category name" className="font-medium" />
                  <Input value={section.items.join(", ")} onChange={(e) => { const u = [...technicalSkills]; u[i] = { ...u[i], items: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; setTechnicalSkills(u); }} placeholder="Skills (comma-separated)" className="text-sm" />
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setTechnicalSkills(technicalSkills.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 mr-1" />Remove category</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setTechnicalSkills([...technicalSkills, { category: "", items: [] }])}>+ Add category</Button>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Button onClick={saveTechnicalSkills} disabled={savingSkills}>{savingSkills ? "Saving..." : "Save Technical Skills"}</Button>
                {isDirtySkills && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader>
              <CardTitle className="text-xl">Achievements</CardTitle>
              <BlockHint>Awards and achievements listed on the About page.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.map((entry, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <Input value={entry.title} onChange={(e) => { const u = [...achievements]; u[i] = { ...u[i], title: e.target.value }; setAchievements(u); }} placeholder="Title" />
                  <Input value={entry.organization} onChange={(e) => { const u = [...achievements]; u[i] = { ...u[i], organization: e.target.value }; setAchievements(u); }} placeholder="Organization / Year" />
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setAchievements(achievements.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setAchievements([...achievements, { title: "", organization: "", year: "" }])}>+ Add achievement</Button>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Button onClick={saveAchievements} disabled={savingAchievements}>{savingAchievements ? "Saving..." : "Save Achievements"}</Button>
                {isDirtyAchievements && <span className="text-sm text-amber-600 font-medium">未儲存</span>}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
      <InsertMediaModal
        open={mediaPickerTarget !== null}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(url) => {
          if (mediaPickerTarget === null) return;
          if (mediaPickerTarget.block === "education") {
            const u = [...educationBlocks];
            u[mediaPickerTarget.index] = { ...u[mediaPickerTarget.index], logoUrl: url };
            setEducationBlocks(u);
          } else if (mediaPickerTarget.block === "experience") {
            const u = [...experienceBlocks];
            u[mediaPickerTarget.index] = { ...u[mediaPickerTarget.index], logoUrl: url };
            setExperienceBlocks(u);
          }
          setMediaPickerTarget(null);
        }}
      />
    </div>
  );
}
