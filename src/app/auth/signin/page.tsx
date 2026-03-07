"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function SignInPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/captcha-required")
      .then((r) => r.json())
      .then((data: { captchaRequired?: boolean }) => setCaptchaRequired(!!data.captchaRequired))
      .catch(() => setCaptchaRequired(false));
  }, []);

  const onTurnstileSuccess = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  useEffect(() => {
    if (!captchaRequired || !SITE_KEY || !captchaReady) return;
    (window as unknown as { turnstileCallback?: (token: string) => void }).turnstileCallback = onTurnstileSuccess;
    return () => {
      delete (window as unknown as { turnstileCallback?: (token: string) => void }).turnstileCallback;
    };
  }, [captchaRequired, captchaReady, onTurnstileSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (captchaRequired && SITE_KEY && !captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        password,
        captchaToken: captchaRequired ? captchaToken ?? "" : undefined,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.ok && result?.url) {
        const path = new URL(result.url).pathname || "/dashboard";
        router.push(path);
        return;
      }
      const err = result?.error;
      if (err?.startsWith?.("TooManyAttempts")) {
        const minutes = err.includes(":") ? err.split(":")[1] : "1";
        setError(`Too many failed attempts. Please try again in ${minutes} minute(s).`);
      } else if (captchaRequired) {
        setError("Wrong password or invalid CAPTCHA. Please try again.");
        setCaptchaToken(null);
        if (typeof (window as unknown as { turnstile?: { reset?: (widgetId?: string) => void } }).turnstile?.reset === "function") {
          (window as unknown as { turnstile?: { reset: (widgetId?: string) => void } }).turnstile?.reset();
        }
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
      {SITE_KEY && captchaRequired && (
        <Script
          src={TURNSTILE_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => setCaptchaReady(true)}
        />
      )}
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
            {captchaRequired && SITE_KEY && captchaReady && (
              <div
                className="cf-turnstile"
                data-sitekey={SITE_KEY}
                data-callback="turnstileCallback"
                data-theme="light"
              />
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
