"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, XCircle, Trash2, Plus, Download, FileText, Trash } from "lucide-react";
import Link from "next/link";

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

export default function AboutPage() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [schoolLogos, setSchoolLogos] = useState<SchoolLogo[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [companyLogos, setCompanyLogos] = useState<CompanyLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvExists, setCvExists] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
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
          setProfileImage(config.profileImage);
          setSchoolLogos(config.schoolLogos || []);
          setProjectImages(config.projectImages || []);
          setCompanyLogos(config.companyLogos || []);
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
    if (!confirm("確定要清理未使用的圖片嗎？此操作無法復原。")) {
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
        message: `成功清理 ${data.deletedCount} 個未使用的圖片檔案`,
      });
    } catch (error) {
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to cleanup",
      });
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">Manage About Page</h2>
        <Button
          variant="outline"
          onClick={handleCleanup}
          disabled={isCleaning}
          className="gap-2"
        >
          <Trash className="h-4 w-4" />
          {isCleaning ? "清理中..." : "清理未使用的圖片"}
        </Button>
      </div>

      {/* CV Upload */}
      <Card>
        <CardHeader>
          <CardTitle>CV (Resume)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Select PDF File
            </label>
            <Input
              id="cv-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.type !== "application/pdf") {
                    setUploadStatus({
                      type: "error",
                      message: "Please select a PDF file",
                    });
                    return;
                  }
                  setCvFile(file);
                  setUploadStatus({ type: null, message: "" });
                }
              }}
              className="cursor-pointer"
            />
            {cvFile && (
              <p className="text-sm text-slate-600">
                Selected: {cvFile.name} ({(cvFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={handleCVUpload}
            disabled={!cvFile || isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload CV"}
          </Button>

          {cvExists && (
            <div className="flex gap-3 pt-2">
              <Link href="/cv.pdf" target="_blank">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Preview CV
                </Button>
              </Link>
              <Link href="/cv.pdf" download="Benedict_Tiong_CV.pdf">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download CV
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Image */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileImage && (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-slate-300">
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
              if (file) {
                await handleUpload("profile", file);
              }
              // 重置 file input
              if (e.target) {
                (e.target as HTMLInputElement).value = "";
              }
            }}
            className="cursor-pointer"
          />
        </CardContent>
      </Card>

      {/* School Logos */}
      <Card>
        <CardHeader>
          <CardTitle>School Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="School name (e.g., NYCU)"
              id="school-name"
              className="max-w-xs"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const schoolNameInput = document.getElementById("school-name") as HTMLInputElement;
                const schoolName = schoolNameInput?.value?.trim();
                if (file && schoolName) {
                  await handleUpload("school", file, schoolName);
                  if (schoolNameInput) {
                    schoolNameInput.value = "";
                  }
                } else if (file && !schoolName) {
                  setUploadStatus({
                    type: "error",
                    message: "Please enter a school name first",
                  });
                }
                // 重置 file input
                if (e.target) {
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              💡 提示：上傳同名學校的 logo 會自動覆蓋舊的
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {schoolLogos.map((logo, index) => (
              <div key={index} className="relative border rounded-lg p-4">
                <div className="relative w-full h-24 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.logo}
                    alt={logo.school}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium text-center mb-2">{logo.school}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSchoolLogo(index)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project Images */}
      <Card>
        <CardHeader>
          <CardTitle>Project Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Project name (e.g., CI/CD Framework)"
              id="project-name"
              className="max-w-xs"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const projectNameInput = document.getElementById("project-name") as HTMLInputElement;
                const projectName = projectNameInput?.value?.trim();
                if (file && projectName) {
                  await handleUpload("project", file, projectName);
                  if (projectNameInput) {
                    projectNameInput.value = "";
                  }
                } else if (file && !projectName) {
                  setUploadStatus({
                    type: "error",
                    message: "Please enter a project name first",
                  });
                }
                // 重置 file input
                if (e.target) {
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              💡 提示：上傳同名專案的圖片會自動覆蓋舊的
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectImages.map((project, index) => (
              <div key={index} className="relative border rounded-lg p-4">
                <div className="relative w-full h-48 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.image}
                    alt={project.project}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <p className="text-sm font-medium mb-2">{project.project}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteProjectImage(index)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Logos */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Company name (e.g., NYCU, Makalot, MUST, NTUT)"
              id="company-name"
              className="max-w-xs"
            />
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const companyNameInput = document.getElementById("company-name") as HTMLInputElement;
                const companyName = companyNameInput?.value?.trim();
                if (file && companyName) {
                  await handleUpload("company", file, companyName);
                  if (companyNameInput) {
                    companyNameInput.value = "";
                  }
                } else if (file && !companyName) {
                  setUploadStatus({
                    type: "error",
                    message: "Please enter a company name first",
                  });
                }
                // 重置 file input
                if (e.target) {
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              💡 提示：上傳同名公司的 logo 會自動覆蓋舊的
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {companyLogos.map((logo, index) => (
              <div key={index} className="relative border rounded-lg p-4">
                <div className="relative w-full h-24 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.logo}
                    alt={logo.company}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-sm font-medium text-center mb-2">{logo.company}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCompanyLogo(index)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      {uploadStatus.type && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            uploadStatus.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {uploadStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
}
