import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { Globe, House, UserRound, Mail, Shield } from "lucide-react";

const tabs = [
  {
    id: "site",
    title: "Site settings",
    description: "Branding, metadata, footer links, backup targets, and data export controls.",
    href: "/dashboard/content/site",
    icon: Globe,
  },
  {
    id: "home",
    title: "Home content",
    description: "Hero, sections, and CTA composition for the public home page.",
    href: "/dashboard/content/home",
    icon: House,
  },
  {
    id: "about",
    title: "About content",
    description: "Profile sections, achievements, skill lists, and long-form profile content.",
    href: "/dashboard/content/about",
    icon: UserRound,
  },
  {
    id: "contact",
    title: "Contact content",
    description: "Contact copy and inbound message experience for visitors.",
    href: "/dashboard/content/contact",
    icon: Mail,
  },
  {
    id: "system",
    title: "System health",
    description: "Database checks, orphaned media cleanup, and maintenance operations.",
    href: "/dashboard/system",
    icon: Shield,
  },
] as const;

export default function GlobalSettingsHubPage() {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Hub"
        title="Global settings"
        description="Unified administration hub for all site-wide configuration and maintenance controls."
      />
      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        <div className="rounded-lg border border-border bg-card p-2">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent/60"
                >
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  {tab.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          {tabs.map((tab) => (
            <Card key={tab.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <tab.icon className="h-4 w-4 text-muted-foreground" />
                  {tab.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tab.description}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={tab.href}>Open {tab.title.toLowerCase()}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
