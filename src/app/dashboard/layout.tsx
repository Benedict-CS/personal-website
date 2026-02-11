import { DashboardShell } from "./dashboard-shell";
import { ToastProvider } from "@/contexts/toast-context";

export const metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
    </ToastProvider>
  );
}
