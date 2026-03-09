import type { Prisma } from "@prisma/client";

type TemplateSeedPage = {
  slug: string;
  title: string;
  blocks: Array<Record<string, unknown>>;
};

export type SiteTemplateSeed = {
  key: string;
  name: string;
  description: string;
  category: string;
  pages: TemplateSeedPage[];
};

const heroBlock = (title: string, subtitle: string) => ({
  type: "MarketingHeroSplit",
  content: { title, subtitle, ctaText: "Get Started", ctaHref: "/contact" },
  styles: { paddingTop: 72, paddingBottom: 72, backgroundColor: "#f8fafc" },
});

export const CORE_SITE_TEMPLATES: SiteTemplateSeed[] = [
  {
    key: "corporate",
    name: "Corporate",
    description: "Professional corporate presentation with services and trust signals.",
    category: "Business",
    pages: [
      { slug: "home", title: "Home", blocks: [heroBlock("Corporate websites at speed", "Enterprise-grade visual editing."), { type: "MarketingFeatureGrid", content: { features: ["Security", "Scalability", "Automation"] }, styles: {} }] },
      { slug: "services", title: "Services", blocks: [{ type: "LayoutGrid3", content: { columns: 3 }, styles: {} }] },
      { slug: "contact", title: "Contact", blocks: [{ type: "InteractiveFormContact", content: { fields: ["name", "email", "company", "message"] }, styles: {} }] },
    ],
  },
  {
    key: "creative-portfolio",
    name: "Creative Portfolio",
    description: "Portfolio-focused layout for agencies and freelancers.",
    category: "Creative",
    pages: [
      { slug: "home", title: "Home", blocks: [heroBlock("Show your best work", "A visual portfolio that converts visitors."), { type: "MediaMasonry", content: { images: [] }, styles: {} }] },
      { slug: "projects", title: "Projects", blocks: [{ type: "MediaGallery", content: { images: [] }, styles: {} }] },
      { slug: "about", title: "About", blocks: [{ type: "LayoutTimeline", content: { items: ["2019 Foundation", "2022 Expansion", "2025 Global"] }, styles: {} }] },
    ],
  },
  {
    key: "tech-blog",
    name: "Tech Blog",
    description: "Publishing-oriented template with rich content surfaces.",
    category: "Publishing",
    pages: [
      { slug: "home", title: "Home", blocks: [heroBlock("Write, publish, and grow", "Designed for content-driven growth."), { type: "LayoutCard", content: { title: "Latest posts", body: "Connect your posts feed here." }, styles: {} }] },
      { slug: "articles", title: "Articles", blocks: [{ type: "LayoutGrid2", content: { columns: 2 }, styles: {} }] },
      { slug: "newsletter", title: "Newsletter", blocks: [{ type: "InteractiveNewsletter", content: { title: "Join the newsletter" }, styles: {} }] },
    ],
  },
  {
    key: "restaurant",
    name: "Restaurant",
    description: "Menu, reservation, and location-ready template for restaurants.",
    category: "Food",
    pages: [
      { slug: "home", title: "Home", blocks: [heroBlock("Dining worth remembering", "Crafted experiences and seasonal menus."), { type: "MediaGallery", content: { images: [] }, styles: {} }] },
      { slug: "menu", title: "Menu", blocks: [{ type: "LayoutTabs", content: { tabs: ["Starters", "Main", "Dessert"] }, styles: {} }] },
      { slug: "reservation", title: "Reservation", blocks: [{ type: "InteractiveFormCustom", content: { fields: ["name", "phone", "date", "party_size"] }, styles: {} }] },
    ],
  },
  {
    key: "local-business",
    name: "Local Business",
    description: "Lead-focused local business template with map and testimonials.",
    category: "Services",
    pages: [
      { slug: "home", title: "Home", blocks: [heroBlock("Grow your local business online", "Capture leads with conversion-ready sections."), { type: "MarketingTestimonials", content: { testimonials: [] }, styles: {} }] },
      { slug: "about", title: "About", blocks: [{ type: "LayoutColumnsFeature", content: { columns: 3 }, styles: {} }] },
      { slug: "contact", title: "Contact", blocks: [{ type: "InteractiveMapCard", content: { address: "Main Street 100" }, styles: {} }, { type: "InteractiveFormContact", content: { fields: ["name", "email", "message"] }, styles: {} }] },
    ],
  },
];

export function buildTemplatePagesPayload(templateKey: string): Prisma.InputJsonValue {
  const template = CORE_SITE_TEMPLATES.find((t) => t.key === templateKey) ?? CORE_SITE_TEMPLATES[0];
  return template.pages as Prisma.InputJsonValue;
}

