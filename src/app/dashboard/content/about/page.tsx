"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, XCircle, Trash2, Download, FileText, Trash, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/contexts/toast-context";

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
  dateRange: string;
  content: string;
}

const emptyBlockEntry = (): AboutBlockEntry => ({
  title: "",
  logoUrl: "",
  organization: "",
  dateRange: "",
  content: "",
});

export default function AboutPage() {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [introText, setIntroText] = useState("");
  const [aboutMainContent, setAboutMainContent] = useState("");
  const [educationBlocks, setEducationBlocks] = useState<AboutBlockEntry[]>([]);
  const [experienceBlocks, setExperienceBlocks] = useState<AboutBlockEntry[]>([]);
  const [projectBlocks, setProjectBlocks] = useState<AboutBlockEntry[]>([]);
  const [schoolLogos, setSchoolLogos] = useState<SchoolLogo[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [companyLogos, setCompanyLogos] = useState<CompanyLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvExists, setCvExists] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [savingIntro, setSavingIntro] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // 載入配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/about/config");
        if (response.ok) {
          const config = await response.json();
          setProfileImage(config.profileImage ?? null);
          setIntroText(typeof config.introText === "string" ? config.introText : "");
          setAboutMainContent(typeof config.aboutMainContent === "string" ? config.aboutMainContent : "");
          setEducationBlocks(Array.isArray(config.educationBlocks) ? config.educationBlocks : []);
          setExperienceBlocks(Array.isArray(config.experienceBlocks) ? config.experienceBlocks : []);
          setProjectBlocks(Array.isArray(config.projectBlocks) ? config.projectBlocks : []);
          setSchoolLogos(Array.isArray(config.schoolLogos) ? config.schoolLogos : []);
          setProjectImages(Array.isArray(config.projectImages) ? config.projectImages : []);
          setCompanyLogos(Array.isArray(config.companyLogos) ? config.companyLogos : []);
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
        const response = await fetch("/cv.pdf", { method: "HEAD" });
        setCvExists(response.ok);
      } catch {
        setCvExists(false);
      }
    };
    checkCVExists();
  }, []);

  // 上傳檔案
  const handleUpload = async (type: "profile" | "school" | "project" | "company", file: File, name?: string) => {
    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      // 驗證必要參數
      if ((type === "school" || type === "project" || type === "company") && !name) {
        throw new Error(`Please enter a ${type} name`);
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      if (name) {
        formData.append("name", name);
      }

      const response = await fetch("/api/about/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to upload file");
      }

      // 更新配置（覆蓋模式：如果已存在同名項目則更新，否則添加）
      try {
        if (type === "profile") {
          await updateConfig({ profileImage: data.url });
        } else if (type === "school" && name) {
          // 檢查是否已存在，如果存在則更新，否則添加
          const existingIndex = schoolLogos.findIndex(l => l.school.toLowerCase() === name.toLowerCase());
          let updated: SchoolLogo[];
          if (existingIndex >= 0) {
            updated = [...schoolLogos];
            updated[existingIndex] = { school: name, logo: data.url };
          } else {
            updated = [...schoolLogos, { school: name, logo: data.url }];
          }
          setSchoolLogos(updated);
          await updateConfig({ schoolLogos: updated });
        } else if (type === "project" && name) {
          // 檢查是否已存在，如果存在則更新，否則添加
          const existingIndex = projectImages.findIndex(p => p.project.toLowerCase() === name.toLowerCase());
          let updated: ProjectImage[];
          if (existingIndex >= 0) {
            updated = [...projectImages];
            updated[existingIndex] = { project: name, image: data.url };
          } else {
            updated = [...projectImages, { project: name, image: data.url }];
          }
          setProjectImages(updated);
          await updateConfig({ projectImages: updated });
        } else if (type === "company" && name) {
          // 檢查是否已存在，如果存在則更新，否則添加
          const existingIndex = companyLogos.findIndex(c => c.company.toLowerCase() === name.toLowerCase());
          let updated: CompanyLogo[];
          if (existingIndex >= 0) {
            updated = [...companyLogos];
            updated[existingIndex] = { company: name, logo: data.url };
          } else {
            updated = [...companyLogos, { company: name, logo: data.url }];
          }
          setCompanyLogos(updated);
          await updateConfig({ companyLogos: updated });
        }

        setUploadStatus({
          type: "success",
          message: "File uploaded and saved successfully! The about page will update on next refresh.",
        });
        toast("File uploaded and saved.", "success");
      } catch (configError) {
        // 上傳成功但配置更新失敗
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
    introText?: string | null;
    aboutMainContent?: string | null;
    educationBlocks?: AboutBlockEntry[];
    experienceBlocks?: AboutBlockEntry[];
    projectBlocks?: AboutBlockEntry[];
    schoolLogos?: SchoolLogo[];
    projectImages?: ProjectImage[];
    companyLogos?: CompanyLogo[];
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
      
      return updated;
    } catch (error) {
      console.error("Error updating config:", error);
      throw error; // 重新拋出錯誤以便上層處理
    }
  };

  // 刪除學校 logo
  const handleDeleteSchoolLogo = async (index: number) => {
    const updated = schoolLogos.filter((_, i) => i !== index);
    setSchoolLogos(updated);
    await updateConfig({ schoolLogos: updated });
  };

  // 刪除專案圖片
  const handleDeleteProjectImage = async (index: number) => {
    const updated = projectImages.filter((_, i) => i !== index);
    setProjectImages(updated);
    await updateConfig({ projectImages: updated });
  };

  // 刪除公司 logo
  const handleDeleteCompanyLogo = async (index: number) => {
    const updated = companyLogos.filter((_, i) => i !== index);
    setCompanyLogos(updated);
    await updateConfig({ companyLogos: updated });
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

  const saveIntro = async () => {
    setSavingIntro(true);
    try {
      await updateConfig({ introText: introText || null });
      setUploadStatus({ type: "success", message: "Intro text saved." });
      toast("Intro text saved.", "success");
    } catch {
      setUploadStatus({ type: "error", message: "Failed to save intro." });
      toast("Failed to save intro.", "error");
    } finally {
      setSavingIntro(false);
    }
  };

  const saveMainContent = async () => {
    setSavingIntro(true);
    try {
      await updateConfig({ aboutMainContent: aboutMainContent || null });
      setUploadStatus({ type: "success", message: "Main content saved." });
      toast("Main content saved.", "success");
    } catch {
      setUploadStatus({ type: "error", message: "Failed to save." });
      toast("Failed to save.", "error");
    } finally {
      setSavingIntro(false);
    }
  };

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
        Blocks below match the order on the public About page. Edit each block and save.
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

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          {/* Block 1: Intro — same as site top */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 1</span>
                <CardTitle className="text-xl">Intro</CardTitle>
              </div>
              <BlockHint>First thing visitors see. Leave empty to hide this block on the site.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                placeholder="Short intro or bio..."
                rows={4}
                className="resize-y"
              />
              <Button onClick={saveIntro} disabled={savingIntro}>
                {savingIntro ? "Saving..." : "Save Intro"}
              </Button>
            </CardContent>
          </Card>

          {/* Block 2: Profile photo — same as site profile card */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 2</span>
                <CardTitle className="text-xl">Profile photo</CardTitle>
              </div>
              <BlockHint>Shown in the profile card next to your name on the About page.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileImage && (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-300 ring-2 ring-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
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
            </CardContent>
          </Card>

          {/* Block 3a: Education — template: title, logo, school, date, content */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 3a</span>
                <CardTitle className="text-xl">Education</CardTitle>
              </div>
              <BlockHint>Each entry: Title (e.g. M.S. in Computer Science), Logo URL, School, Date range, Content (Markdown for bullets).</BlockHint>
            </CardHeader>
            <CardContent className="space-y-6">
              {educationBlocks.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Entry {index + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => { const u = educationBlocks.filter((_, i) => i !== index); setEducationBlocks(u); }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Title (e.g. M.S. in Computer Science)" value={entry.title} onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], title: e.target.value }; setEducationBlocks(u); }} />
                    <Input placeholder="Date range (e.g. Sep 2023 - Jan 2026)" value={entry.dateRange} onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setEducationBlocks(u); }} />
                  </div>
                  <Input placeholder="School / Organization" value={entry.organization} onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], organization: e.target.value }; setEducationBlocks(u); }} />
                  <Input placeholder="Logo image URL (optional)" value={entry.logoUrl ?? ""} onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], logoUrl: e.target.value || null }; setEducationBlocks(u); }} />
                  <Textarea placeholder="Content (Markdown OK, e.g. **Thesis:** ..." value={entry.content} onChange={(e) => { const u = [...educationBlocks]; u[index] = { ...u[index], content: e.target.value }; setEducationBlocks(u); }} rows={4} className="resize-y text-sm" />
                </div>
              ))}
              <Button variant="outline" onClick={() => setEducationBlocks([...educationBlocks, emptyBlockEntry()])}>
                + Add Education entry
              </Button>
              <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ educationBlocks }); setUploadStatus({ type: "success", message: "Education saved." }); toast("Education saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>
                {savingIntro ? "Saving..." : "Save Education"}
              </Button>
            </CardContent>
          </Card>

          {/* Block 3b: Experience */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 3b</span>
                <CardTitle className="text-xl">Experience</CardTitle>
              </div>
              <BlockHint>Each entry: Title, Logo URL, Company, Date range, Content (Markdown).</BlockHint>
            </CardHeader>
            <CardContent className="space-y-6">
              {experienceBlocks.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Entry {index + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => { const u = experienceBlocks.filter((_, i) => i !== index); setExperienceBlocks(u); }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Title (e.g. Research Assistant)" value={entry.title} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], title: e.target.value }; setExperienceBlocks(u); }} />
                    <Input placeholder="Date range" value={entry.dateRange} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setExperienceBlocks(u); }} />
                  </div>
                  <Input placeholder="Company / Organization" value={entry.organization} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], organization: e.target.value }; setExperienceBlocks(u); }} />
                  <Input placeholder="Logo image URL (optional)" value={entry.logoUrl ?? ""} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], logoUrl: e.target.value || null }; setExperienceBlocks(u); }} />
                  <Textarea placeholder="Content (Markdown)" value={entry.content} onChange={(e) => { const u = [...experienceBlocks]; u[index] = { ...u[index], content: e.target.value }; setExperienceBlocks(u); }} rows={4} className="resize-y text-sm" />
                </div>
              ))}
              <Button variant="outline" onClick={() => setExperienceBlocks([...experienceBlocks, emptyBlockEntry()])}>
                + Add Experience entry
              </Button>
              <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ experienceBlocks }); setUploadStatus({ type: "success", message: "Experience saved." }); toast("Experience saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>
                {savingIntro ? "Saving..." : "Save Experience"}
              </Button>
            </CardContent>
          </Card>

          {/* Block 3c: Projects */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 3c</span>
                <CardTitle className="text-xl">Projects</CardTitle>
              </div>
              <BlockHint>Each entry: Title, Image URL, Organization, Date range, Content (Markdown).</BlockHint>
            </CardHeader>
            <CardContent className="space-y-6">
              {projectBlocks.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Entry {index + 1}</span>
                    <Button variant="ghost" size="sm" onClick={() => { const u = projectBlocks.filter((_, i) => i !== index); setProjectBlocks(u); }} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Project title" value={entry.title} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], title: e.target.value }; setProjectBlocks(u); }} />
                    <Input placeholder="Date range" value={entry.dateRange} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], dateRange: e.target.value }; setProjectBlocks(u); }} />
                  </div>
                  <Input placeholder="Organization (optional)" value={entry.organization} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], organization: e.target.value }; setProjectBlocks(u); }} />
                  <Input placeholder="Image URL (optional)" value={entry.logoUrl ?? ""} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], logoUrl: e.target.value || null }; setProjectBlocks(u); }} />
                  <Textarea placeholder="Content (Markdown)" value={entry.content} onChange={(e) => { const u = [...projectBlocks]; u[index] = { ...u[index], content: e.target.value }; setProjectBlocks(u); }} rows={4} className="resize-y text-sm" />
                </div>
              ))}
              <Button variant="outline" onClick={() => setProjectBlocks([...projectBlocks, emptyBlockEntry()])}>
                + Add Project entry
              </Button>
              <Button onClick={async () => { setSavingIntro(true); try { await updateConfig({ projectBlocks }); setUploadStatus({ type: "success", message: "Projects saved." }); toast("Projects saved.", "success"); } catch { setUploadStatus({ type: "error", message: "Failed to save." }); toast("Failed to save.", "error"); } finally { setSavingIntro(false); }} } disabled={savingIntro}>
                {savingIntro ? "Saving..." : "Save Projects"}
              </Button>
            </CardContent>
          </Card>

          {/* Block 4: CV download */}
          <Card className="border-l-4 border-l-violet-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 4</span>
                <CardTitle className="text-xl">Download CV (PDF)</CardTitle>
              </div>
              <BlockHint>PDF file for the &quot;Download CV&quot; button on the About page.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="cv-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== "application/pdf") {
                        setUploadStatus({ type: "error", message: "Please select a PDF file" });
                        return;
                      }
                      setCvFile(file);
                      setUploadStatus({ type: null, message: "" });
                    }
                  }}
                  className="cursor-pointer max-w-xs"
                />
                {cvFile && (
                  <p className="text-sm text-slate-600">Selected: {cvFile.name} ({(cvFile.size / 1024).toFixed(2)} KB)</p>
                )}
              </div>
              <Button
                type="button"
                onClick={handleCVUpload}
                disabled={!cvFile || isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload CV"}
              </Button>
              {cvExists && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <Link href="/api/cv/download" target="_blank" prefetch={false}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Preview
                    </Button>
                  </Link>
                  <Link href="/api/cv/download" download="Benedict_Tiong_CV.pdf" prefetch={false}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Block 5: School logos (Education section on site) */}
          <Card className="border-l-4 border-l-sky-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 5</span>
                <CardTitle className="text-xl">School logos</CardTitle>
              </div>
              <BlockHint>Logos shown next to schools in the Education section (e.g. NYCU, NTUT). Same name = overwrite.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="text"
                  placeholder="School name (e.g. NYCU)"
                  id="school-name"
                  className="max-w-[200px]"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    const name = (document.getElementById("school-name") as HTMLInputElement)?.value?.trim();
                    if (file && name) {
                      await handleUpload("school", file, name);
                      (document.getElementById("school-name") as HTMLInputElement).value = "";
                    } else if (file) {
                      setUploadStatus({ type: "error", message: "Enter school name first" });
                    }
                    if (e.target) (e.target as HTMLInputElement).value = "";
                  }}
                  className="cursor-pointer max-w-xs"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {schoolLogos.map((logo, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="relative w-full h-24 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo.logo} alt={logo.school} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm font-medium text-center mb-2">{logo.school}</p>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSchoolLogo(index)} className="w-full">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Block 6: Project images (Projects section on site) */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 6</span>
                <CardTitle className="text-xl">Project images</CardTitle>
              </div>
              <BlockHint>Images for the Projects section. Same project name = overwrite.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="text"
                  placeholder="Project name (e.g. CI/CD Framework)"
                  id="project-name"
                  className="max-w-[200px]"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    const name = (document.getElementById("project-name") as HTMLInputElement)?.value?.trim();
                    if (file && name) {
                      await handleUpload("project", file, name);
                      (document.getElementById("project-name") as HTMLInputElement).value = "";
                    } else if (file) {
                      setUploadStatus({ type: "error", message: "Enter project name first" });
                    }
                    if (e.target) (e.target as HTMLInputElement).value = "";
                  }}
                  className="cursor-pointer max-w-xs"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectImages.map((project, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="relative w-full h-48 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={project.image} alt={project.project} className="w-full h-full object-cover rounded" />
                    </div>
                    <p className="text-sm font-medium mb-2">{project.project}</p>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProjectImage(index)} className="w-full">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Block 7: Company logos (Experience section on site) */}
          <Card className="border-l-4 border-l-rose-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5">Block 7</span>
                <CardTitle className="text-xl">Company logos</CardTitle>
              </div>
              <BlockHint>Logos for the Experience section (e.g. NYCU, Makalot). Same name = overwrite.</BlockHint>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  type="text"
                  placeholder="Company name (e.g. NYCU, Makalot)"
                  id="company-name"
                  className="max-w-[200px]"
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    const name = (document.getElementById("company-name") as HTMLInputElement)?.value?.trim();
                    if (file && name) {
                      await handleUpload("company", file, name);
                      (document.getElementById("company-name") as HTMLInputElement).value = "";
                    } else if (file) {
                      setUploadStatus({ type: "error", message: "Enter company name first" });
                    }
                    if (e.target) (e.target as HTMLInputElement).value = "";
                  }}
                  className="cursor-pointer max-w-xs"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {companyLogos.map((logo, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="relative w-full h-24 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo.logo} alt={logo.company} className="w-full h-full object-contain" />
                    </div>
                    <p className="text-sm font-medium text-center mb-2">{logo.company}</p>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteCompanyLogo(index)} className="w-full">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
