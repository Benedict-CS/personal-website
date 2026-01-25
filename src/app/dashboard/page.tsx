import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Redirect dashboard root to posts page
export default function DashboardPage() {
  redirect("/dashboard/posts");
}
