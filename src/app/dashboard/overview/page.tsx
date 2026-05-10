import { redirect } from "next/navigation";

/** Legacy URL; overview UI removed — send to Analytics. */
export default function DashboardOverviewRedirectPage() {
  redirect("/dashboard/analytics");
}
