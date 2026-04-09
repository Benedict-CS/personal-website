"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import Script from "next/script";
import { isSessionExpiredError } from "@/lib/session-expired";
import { motion } from "framer-motion";
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

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const errorId = "signin-error-message";

  const errorParam = searchParams.get("error");
  const sessionExpired = isSessionExpiredError(errorParam);

  useEffect(() => {
    if (!sessionExpired) return;
    signOut({ redirect: false });
  }, [sessionExpired]);

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
    const callbackUrl = searchParams.get("callbackUrl") || "/editor/home";

    try {
      const result = await signIn("credentials", {
        password,
        captchaToken: captchaRequired ? captchaToken ?? "" : undefined,
        callbackUrl,
        redirect: false,
      });
      if (result?.ok && result?.url) {
        const nextUrl = new URL(result.url, window.location.origin);
        const target = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` || "/editor/home";
        router.push(target);
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      {SITE_KEY && captchaRequired && (
        <Script
          src={TURNSTILE_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => setCaptchaReady(true)}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
        className="w-full max-w-md"
      >
        <Card className="w-full border-[var(--border)] shadow-[var(--elevation-3)]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {sessionExpired && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800" role="alert">
                  Your session has expired. Please sign in again.
                </p>
              )}
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <label htmlFor="admin-password" className="sr-only">
                  Admin password
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setError(null);
                    setPassword(e.target.value);
                  }}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? errorId : undefined}
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
              {error ? (
                <p id={errorId} className="sr-only" role="status" aria-live="polite">
                  {error}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
