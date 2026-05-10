import { negotiatePlatformLocale, isPlatformLocale } from "@/i18n/platform";

describe("platform locale negotiation", () => {
  it("negotiates from Accept-Language", () => {
    expect(negotiatePlatformLocale("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(negotiatePlatformLocale("de-DE,de;q=0.9")).toBe("de");
  });

  it("validates locale tags", () => {
    expect(isPlatformLocale("en")).toBe(true);
    expect(isPlatformLocale("xx")).toBe(false);
  });
});
