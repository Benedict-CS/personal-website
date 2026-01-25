"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [cvExists, setCvExists] = useState(false);

  // 檢查 CV 是否存在
  useEffect(() => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-slate-900">
          Manage CV
        </h2>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Upload New CV</CardTitle>
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
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-slate-600">
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

      {cvExists && (
        <Card>
          <CardHeader>
            <CardTitle>Current CV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-slate-400">
              A CV is currently available. You can preview or download it below.
            </p>
            <div className="flex gap-3">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
