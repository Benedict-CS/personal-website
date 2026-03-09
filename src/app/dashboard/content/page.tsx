"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, FileText, Mail, Settings, Layers, UserCircle2 } from "lucide-react";

const coreItems = [
  { href: "/dashboard/content/site", label: "Site settings", icon: Settings, description: "Site name, logo, favicon, meta, navigation, footer text, OG image, template, setup" },
  { href: "/dashboard/posts", label: "Posts", icon: FileText, description: "Blog articles, publish state, revisions, and post metadata" },
];

const immersiveItems = [
  { href: "/editor/home", label: "Home editor", icon: Home, description: "True WYSIWYG page editing with inline text and media updates" },
  { href: "/editor/about", label: "About editor", icon: UserCircle2, description: "Edit the live About page directly on the real frontend layout" },
  { href: "/editor/contact", label: "Contact editor", icon: Mail, description: "Edit contact copy directly on the live page view" },
  { href: "/dashboard/content/pages", label: "Custom pages", icon: Layers, description: "Manage additional pages; open each one in immersive editor flow" },
];

export default function ContentIndexPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Content</h2>
      <p className="text-slate-600">Dashboard is for management. Visual page editing is now isolated in immersive editor routes.</p>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Core pages</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coreItems.map(({ href, label, icon: Icon, description }) => (
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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Immersive editors</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {immersiveItems.map(({ href, label, icon: Icon, description }) => (
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
    </div>
  );
}
