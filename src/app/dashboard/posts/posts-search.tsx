"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function PostsSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const apply = useCallback(
    (q: string) => {
      const p = new URLSearchParams(searchParams);
      const trimmed = q.trim();
      if (trimmed) p.set("q", trimmed);
      else p.delete("q");
      router.push(p.toString() ? `${pathname}?${p.toString()}` : pathname);
    },
    [pathname, router, searchParams]
  );

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(value);
      }}
    >
      <Search className="h-4 w-4 text-slate-500 shrink-0" />
      <Input
        type="search"
        placeholder="Search by title or slug..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-48 sm:w-56"
        aria-label="Search posts"
      />
    </form>
  );
}
