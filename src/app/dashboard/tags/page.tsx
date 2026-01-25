"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface CleanedTag {
  id: string;
  oldName: string;
  newName: string;
}

interface CleanupResult {
  cleanedCount: number;
  cleanedTags: CleanedTag[];
  errors?: string[];
  message: string;
}

export default function TagsPage() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCleanup = async () => {
    if (!confirm("確定要清理所有帶引號的標籤嗎？這個操作會修改資料庫中的標籤名稱。")) {
      return;
    }

    setIsCleaning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/tags/cleanup", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "清理失敗");
      }

      const data: CleanupResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error cleaning tags:", err);
      setError(err instanceof Error ? err.message : "清理標籤時發生錯誤");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>標籤管理 - 清理引號</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 mb-1">清理說明</h3>
                <p className="text-sm text-slate-600">
                  此功能會自動清理資料庫中所有標籤名稱前後的引號（單引號和雙引號）。
                  如果清理後的標籤名稱與現有標籤重複，系統會自動合併標籤。
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="w-full sm:w-auto"
          >
            {isCleaning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                清理中...
              </>
            ) : (
              "開始清理標籤"
            )}
          </Button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-1">錯誤</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-2">
                    清理完成
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    {result.message}
                  </p>

                  {result.cleanedTags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-green-900 mb-2 text-sm">
                        已清理的標籤：
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {result.cleanedTags.map((tag) => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 text-sm bg-white rounded p-2 border border-green-200"
                          >
                            <span className="text-slate-600 line-through">
                              {tag.oldName}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="font-medium text-green-700">
                              {tag.newName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-900 mb-2 text-sm">
                        錯誤的標籤：
                      </h4>
                      <ul className="list-disc list-inside text-sm text-red-700">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
