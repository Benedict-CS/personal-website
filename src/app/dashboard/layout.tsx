import { DashboardShell } from "./dashboard-shell";

export const metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
