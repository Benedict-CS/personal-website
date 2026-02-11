"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeaveGuard } from "@/contexts/leave-guard-context";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Link that triggers leave confirmation when dashboard edit page has unsaved changes.
 */
export function LeaveGuardLink({ href, onClick, ...rest }: Props) {
  const pathname = usePathname();
  const { dirty, requestLeave } = useLeaveGuard();
  const isCurrent = pathname === href;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (dirty && !isCurrent && href.startsWith("/dashboard")) {
      e.preventDefault();
      requestLeave(href);
      return;
    }
    onClick?.(e);
  };

  return <Link href={href} onClick={handleClick} {...rest} />;
}
