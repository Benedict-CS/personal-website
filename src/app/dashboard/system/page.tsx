import { redirect } from "next/navigation";

/** Legacy URL; system dashboard UI removed — send to Analytics. */
export default function DashboardSystemRedirectPage() {
  redirect("/dashboard/analytics");
}
