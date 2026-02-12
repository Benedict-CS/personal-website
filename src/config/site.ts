import { isPrivateUrl } from "@/lib/is-private-url";

const defaultSiteUrl = "https://benedict.winlab.tw";
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
// Avoid private/local URLs so the browser does not ask for "local network" permission.
const siteUrl = envSiteUrl && !isPrivateUrl(envSiteUrl) ? envSiteUrl : defaultSiteUrl;

export const siteConfig = {
  name: "Benedict Tiong",
  title: "Benedict Tiong - Network Administrator & Full Stack Developer",
  description:
    "Network Administrator | Full Stack Developer | Open Source Enthusiast. Master's student in Computer Science at NYCU, specializing in Cloud Native Technologies, CI/CD, and Network Infrastructure.",
  url: siteUrl,
  ogImage: null as string | null, // Use Site settings → OG image (S3) instead; no public/images needed
  links: {
    github: "https://github.com/Benedict-CS",
    linkedin: "https://www.linkedin.com/in/benedict-tiong",
    email: "benedict.cs12@nycu.edu.tw",
  },
  author: {
    name: "Benedict Ing Ngie Tiong",
    email: "benedict.cs12@nycu.edu.tw",
    phone: "+886 905-754-546",
  },
} as const;
