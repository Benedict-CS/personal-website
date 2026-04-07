import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

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
