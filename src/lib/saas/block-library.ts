export type BlockDefinition = {
  type: string;
  label: string;
  category: "layout" | "media" | "marketing" | "interactive";
  defaultContent: Record<string, unknown>;
  defaultStyles: Record<string, unknown>;
};

const baseStyles = {
  paddingTop: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  paddingRight: 24,
  marginTop: 0,
  marginBottom: 16,
  borderRadius: 12,
  backgroundColor: "#ffffff",
  color: "#0f172a",
  fontFamily: "Inter",
  fontSize: 16,
  fontWeight: 400,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
};

function def(
  type: string,
  label: string,
  category: BlockDefinition["category"],
  defaultContent: Record<string, unknown>
): BlockDefinition {
  return { type, label, category, defaultContent, defaultStyles: baseStyles };
}

export const BLOCK_LIBRARY: BlockDefinition[] = [
  def("LayoutContainer", "Container", "layout", { maxWidth: "1280px" }),
  def("LayoutGrid1", "Grid 1 Column", "layout", { columns: 1 }),
  def("LayoutGrid2", "Grid 2 Columns", "layout", { columns: 2 }),
  def("LayoutGrid3", "Grid 3 Columns", "layout", { columns: 3 }),
  def("LayoutGrid4", "Grid 4 Columns", "layout", { columns: 4 }),
  def("LayoutFlexRow", "Flex Row", "layout", { gap: 16, justify: "start" }),
  def("LayoutFlexColumn", "Flex Column", "layout", { gap: 12, align: "stretch" }),
  def("LayoutCard", "Card", "layout", { title: "Card title", body: "Card description" }),
  def("LayoutTabs", "Tabs", "layout", { tabs: ["Overview", "Features", "FAQ"] }),
  def("LayoutAccordionContainer", "Accordion Group", "layout", { title: "Accordion list" }),
  def("LayoutDivider", "Divider", "layout", { thickness: 1 }),
  def("LayoutSpacer", "Spacer", "layout", { height: 40 }),
  def("LayoutColumnsFeature", "Feature Columns", "layout", { columns: 3 }),
  def("LayoutTimeline", "Timeline", "layout", { items: ["Kickoff", "Build", "Launch"] }),
  def("LayoutStatsBar", "Stats Bar", "layout", { items: ["99.9% Uptime", "24/7 Support"] }),
  def("MediaImage", "Image", "media", { src: "", alt: "Image", fit: "cover" }),
  def("MediaImageCaption", "Image with Caption", "media", { src: "", caption: "Caption text" }),
  def("MediaGallery", "Image Gallery", "media", { images: [] }),
  def("MediaMasonry", "Masonry Grid", "media", { images: [] }),
  def("MediaCarousel", "Image Carousel", "media", { images: [] }),
  def("MediaVideoEmbed", "Video Embed", "media", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
  def("MediaVideoUpload", "Video Player", "media", { src: "", poster: "" }),
  def("MediaAudioEmbed", "Audio Embed", "media", { url: "" }),
  def("MediaAudioPlayer", "Audio Player", "media", { src: "" }),
  def("MediaLogoStrip", "Logo Strip", "media", { logos: [] }),
  def("MediaAvatarList", "Avatar List", "media", { users: [] }),
  def("MediaMapEmbed", "Map Embed", "media", { embedUrl: "" }),
  def("MediaFileDownload", "File Download", "media", { label: "Download", href: "" }),
  def("MediaBeforeAfter", "Before/After", "media", { before: "", after: "" }),
  def("MediaProductShots", "Product Shots", "media", { images: [] }),
  def("MarketingHeroSimple", "Hero Simple", "marketing", { title: "Build faster websites", subtitle: "Visual editor with production controls." }),
  def("MarketingHeroSplit", "Hero Split", "marketing", { title: "Scale with confidence", subtitle: "Publish-ready page builder." }),
  def("MarketingFeatureGrid", "Feature Grid", "marketing", { features: [] }),
  def("MarketingFeatureList", "Feature List", "marketing", { features: [] }),
  def("MarketingPricingTable", "Pricing Table", "marketing", { plans: [] }),
  def("MarketingTestimonials", "Testimonials", "marketing", { testimonials: [] }),
  def("MarketingTestimonialSlider", "Testimonial Slider", "marketing", { testimonials: [] }),
  def("MarketingFaqAccordion", "FAQ Accordion", "marketing", { faqs: [] }),
  def("MarketingCtaBanner", "CTA Banner", "marketing", { title: "Start your free trial", buttonText: "Get Started" }),
  def("MarketingCtaCard", "CTA Card", "marketing", { title: "Ready to launch?" }),
  def("MarketingLogoCloud", "Logo Cloud", "marketing", { logos: [] }),
  def("MarketingComparisonTable", "Comparison Table", "marketing", { rows: [] }),
  def("MarketingRoadmap", "Roadmap", "marketing", { milestones: [] }),
  def("MarketingAnnouncement", "Announcement Bar", "marketing", { message: "New release available." }),
  def("MarketingCountdown", "Countdown", "marketing", { target: new Date().toISOString() }),
  def("InteractiveFormContact", "Contact Form", "interactive", { fields: ["name", "email", "message"] }),
  def("InteractiveFormCustom", "Custom Form", "interactive", { fields: [] }),
  def("InteractiveNewsletter", "Newsletter Signup", "interactive", { title: "Subscribe for updates" }),
  def("InteractiveMapCard", "Map Card", "interactive", { address: "San Francisco, CA" }),
  def("InteractiveButtonGroup", "Button Group", "interactive", { buttons: ["Primary", "Secondary"] }),
  def("InteractiveFaqSearch", "FAQ Search", "interactive", { placeholder: "Search help center..." }),
  def("InteractiveTabsFaq", "FAQ Tabs", "interactive", { tabs: ["General", "Billing", "Support"] }),
  def("InteractiveFeatureToggle", "Feature Toggle", "interactive", { items: ["Security", "Analytics"] }),
  def("InteractiveCookieBanner", "Cookie Banner", "interactive", { message: "We use cookies to improve experience." }),
  def("CommerceProductGrid", "Dynamic Product Grid", "interactive", { title: "Featured products", collection: "all", limit: 8 }),
  def("CommerceSingleProduct", "Single Product Display", "interactive", { productSlug: "product-slug", showVariantPicker: true }),
  def("CommerceCartDrawer", "Shopping Cart Slide-out", "interactive", { position: "right", showSubtotal: true }),
  def("CommerceCheckoutFlow", "Checkout Flow", "interactive", { steps: ["Cart", "Shipping", "Payment", "Review"] }),
  def("CommerceCategorySidebar", "Category Filter Sidebar", "interactive", { source: "categories" }),
];

