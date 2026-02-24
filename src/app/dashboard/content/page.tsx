"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, FileText, Mail, Settings, Layers } from "lucide-react";

const items = [
  { href: "/dashboard/content/site", label: "Site settings", icon: Settings, description: "Site name, logo, favicon, meta, navigation, footer text, OG image, template, setup" },
  { href: "/dashboard/content/home", label: "Home", icon: Home, description: "Hero title, subtitle, skills, CTA buttons" },
  { href: "/dashboard/content/contact", label: "Contact", icon: Mail, description: "Intro text and form description" },
  { href: "/dashboard/content/about", label: "About & CV", icon: FileText, description: "Profile image, intro text, logos, CV" },
  { href: "/dashboard/content/pages", label: "Custom pages", icon: Layers, description: "Add pages like Portfolio, Services; link from nav" },
];

export default function ContentIndexPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Content</h2>
      <p className="text-slate-600">Edit homepage, contact, and about page content.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, label, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <Card className="h-full card-interactive border-slate-200 hover:border-slate-300 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-slate-600" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
