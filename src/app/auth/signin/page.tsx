"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.ok && result?.url) {
        // Stay on current host (e.g. backup VM); result.url is built from NEXTAUTH_URL (main domain).
        const path = new URL(result.url).pathname || "/dashboard";
        router.push(path);
        return;
      }
      const err = result?.error;
      if (err?.startsWith?.("TooManyAttempts")) {
        const minutes = err.includes(":") ? err.split(":")[1] : "1";
        setError(`Too many failed attempts. Please try again in ${minutes} minute(s).`);
      } else {
        setError("Wrong password. Please try again.");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md animate-in fade-in duration-300">
        <CardHeader>
          <CardTitle className="text-slate-900">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setError(null);
                  setPassword(e.target.value);
                }}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
