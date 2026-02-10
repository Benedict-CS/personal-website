import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect dashboard root to analytics
export default function DashboardPage() {
  redirect("/dashboard/analytics");
}
