"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { formatAbsoluteDateTime, formatRelativeTime } from "@/lib/relative-time";

export const dynamic = "force-dynamic";

type CvStatusPayload = {
  exists: boolean;
  lastModified: string | null;
  contentLength: number | null;
};

export default function CVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [cvStatus, setCvStatus] = useState<CvStatusPayload | null>(null);
  const [profilePdfLoading, setProfilePdfLoading] = useState(false);
  const [profilePdfMessage, setProfilePdfMessage] = useState<{ type: "error"; text: string } | null>(null);

  const refreshCvStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/cv/status", { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        setCvStatus({ exists: false, lastModified: null, contentLength: null });
        return;
      }
      const data = (await response.json()) as Record<string, unknown>;
      setCvStatus({
        exists: data.exists === true,
        lastModified: typeof data.lastModified === "string" ? data.lastModified : null,
        contentLength: typeof data.contentLength === "number" ? data.contentLength : null,
      });
    } catch {
      setCvStatus({ exists: false, lastModified: null, contentLength: null });
    }
  }, []);

  useEffect(() => {
    void refreshCvStatus();
  }, [refreshCvStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setUploadStatus({
          type: "error",
          message: "Please select a PDF file.",
        });
        return;
      }
      setFile(selectedFile);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const exportStructuredProfilePdf = async () => {
    setProfilePdfMessage(null);
    setProfilePdfLoading(true);
    try {
      const response = await fetch("/api/cv/export-profile-pdf", { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(typeof data.error === "string" ? data.error : "Could not generate profile PDF.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const cd = response.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      link.download = match?.[1] ?? `cv-profile-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setProfilePdfMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not generate profile PDF.",
      });
    } finally {
      setProfilePdfLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        type: "error",
        message: "Please select a file first.",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      const formData = new FormData();
      formData.append("file", file);

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
      setFile(null);
      await refreshCvStatus();
      
      // Reset file input
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

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Content"
        title="Manage CV"
        description="Upload a PDF for the public CV download, or print your About page."
      />

      <Card>
        <CardHeader>
          <CardTitle>Web resume → PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export your public About page as a PDF using the browser print dialog (Save as PDF).
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/about?print=1" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Open printable About page
              </Button>
            </Link>
            <Button
              type="button"
              variant="default"
              className="gap-2"
              disabled={profilePdfLoading}
              onClick={() => void exportStructuredProfilePdf()}
            >
              {profilePdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              Export profile PDF
            </Button>
          </div>
          {profilePdfMessage ? (
            <p className="text-xs text-rose-700" role="alert">
              {profilePdfMessage.text}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Profile PDF is generated from structured About data (education, experience, projects, skills, and achievements).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Upload New CV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select PDF File
            </label>
            <Input
              id="cv-file"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload CV"}
          </Button>

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
        </CardContent>
      </Card>

      {cvStatus === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          Checking whether a CV is on file…
        </p>
      ) : !cvStatus.exists ? (
        <DashboardEmptyState
          illustration="documents"
          title="No CV PDF on file"
          description="Upload a PDF above to enable the public CV download route and dashboard preview."
          className="py-8"
        />
      ) : null}

      {cvStatus?.exists && (
        <Card>
          <CardHeader>
            <CardTitle>Current CV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A CV is currently available. You can preview or download it below.
            </p>
            {cvStatus.lastModified ? (
              <p className="text-sm text-muted-foreground">
                Last uploaded{" "}
                <span className="tabular-nums" title={formatAbsoluteDateTime(cvStatus.lastModified)}>
                  {formatRelativeTime(cvStatus.lastModified)}
                </span>
                {cvStatus.contentLength != null
                  ? ` · ${(cvStatus.contentLength / 1024).toFixed(1)} KB`
                  : null}
              </p>
            ) : null}
            <div className="flex gap-3">
              <Link href="/api/cv/download" target="_blank" prefetch={false}>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Preview CV
                </Button>
              </Link>
              <a href="/api/cv/download">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download CV
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
