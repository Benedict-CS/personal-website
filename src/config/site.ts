import { isPrivateUrl } from "@/lib/is-private-url";

const defaultSiteUrl = "https://example.com";
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
// Avoid private/local URLs so the browser does not ask for "local network" permission.
const siteUrl = envSiteUrl && !isPrivateUrl(envSiteUrl) ? envSiteUrl : defaultSiteUrl;

export const siteConfig = {
  name: "Your Brand",
  title: "Your Brand - Modern Website Builder",
  description:
    "Commercial-grade website builder for modern teams. Build and publish fully responsive pages with a visual editor.",
  url: siteUrl,
  ogImage: null as string | null, // Use Site settings → OG image (S3) instead; no public/images needed
  links: {
    github: "https://github.com/your-org",
    linkedin: "https://www.linkedin.com/company/your-brand",
    email: "hello@example.com",
  },
  author: {
    name: "Site Administrator",
    email: "hello@example.com",
    phone: "+1 000 000 0000",
  },
} as const;
