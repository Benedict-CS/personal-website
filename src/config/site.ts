export const siteConfig = {
  name: "Benedict Tiong",
  title: "Benedict Tiong - Network Administrator & Full Stack Developer",
  description:
    "Network Administrator | Full Stack Developer | Open Source Enthusiast. Master's student in Computer Science at NYCU, specializing in Cloud Native Technologies, CI/CD, and Network Infrastructure.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://benedict.winlab.tw",
  ogImage: "/images/og.png",
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
