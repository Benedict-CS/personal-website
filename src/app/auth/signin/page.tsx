import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Admin sign-in",
  description: "Sign in to access the dashboard and editor.",
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
