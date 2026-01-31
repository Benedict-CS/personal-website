"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PrevNextKeysProps {
  prevHref: string | null;
  nextHref: string | null;
}

export function PrevNextKeys({ prevHref, nextHref }: PrevNextKeysProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
      if (isInput) return;

      if (e.key === "ArrowLeft" && prevHref) {
        e.preventDefault();
        router.push(prevHref);
      } else if (e.key === "ArrowRight" && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, prevHref, nextHref]);

  return null;
}
