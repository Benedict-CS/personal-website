import {
  POST_TEMPLATES,
  getTemplate,
  applyTemplate,
  listTemplates,
} from "@/lib/post-templates";

describe("POST_TEMPLATES", () => {
  it("contains at least 5 templates", () => {
    expect(POST_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has a unique id", () => {
    const ids = POST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each template has non-empty required fields", () => {
    for (const t of POST_TEMPLATES) {
      expect(t.id.length).toBeGreaterThan(0);
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.content.length).toBeGreaterThan(0);
      expect(t.suggestedTags.length).toBeGreaterThan(0);
      expect(t.suggestedDescription.length).toBeGreaterThan(0);
    }
  });

  it("each template content contains at least one heading", () => {
    for (const t of POST_TEMPLATES) {
      expect(t.content).toMatch(/^##?\s+/m);
    }
  });

  it("includes the tutorial template", () => {
    const tutorial = POST_TEMPLATES.find((t) => t.id === "tutorial");
    expect(tutorial).toBeDefined();
    expect(tutorial!.name).toContain("Tutorial");
  });

  it("includes the comparison template", () => {
    const comparison = POST_TEMPLATES.find((t) => t.id === "comparison");
    expect(comparison).toBeDefined();
    expect(comparison!.content).toContain("Option A");
  });

  it("includes the TIL template", () => {
    const til = POST_TEMPLATES.find((t) => t.id === "til");
    expect(til).toBeDefined();
    expect(til!.content).toContain("Problem");
  });
});

describe("getTemplate", () => {
  it("returns a template by ID", () => {
    const template = getTemplate("tutorial");
    expect(template).toBeDefined();
    expect(template!.id).toBe("tutorial");
  });

  it("returns undefined for unknown ID", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });

  it("returns undefined for empty ID", () => {
    expect(getTemplate("")).toBeUndefined();
  });
});

describe("applyTemplate", () => {
  it("returns content, tags, and description for valid template", () => {
    const result = applyTemplate("tutorial");
    expect(result).not.toBeNull();
    expect(result!.content.length).toBeGreaterThan(0);
    expect(result!.tags).toContain("Tutorial");
    expect(result!.description.length).toBeGreaterThan(0);
  });

  it("returns null for unknown template ID", () => {
    expect(applyTemplate("nonexistent")).toBeNull();
  });

  it("tags are comma-separated when multiple", () => {
    const template = POST_TEMPLATES.find((t) => t.suggestedTags.length > 0);
    if (template) {
      const result = applyTemplate(template.id);
      expect(result).not.toBeNull();
      if (template.suggestedTags.length > 1) {
        expect(result!.tags).toContain(",");
      }
    }
  });

  it("content matches the template definition", () => {
    for (const t of POST_TEMPLATES) {
      const result = applyTemplate(t.id);
      expect(result).not.toBeNull();
      expect(result!.content).toBe(t.content);
    }
  });

  it("description matches the template suggestion", () => {
    for (const t of POST_TEMPLATES) {
      const result = applyTemplate(t.id);
      expect(result!.description).toBe(t.suggestedDescription);
    }
  });
});

describe("listTemplates", () => {
  it("returns all templates with id, name, icon, description", () => {
    const list = listTemplates();
    expect(list.length).toBe(POST_TEMPLATES.length);
    for (const item of list) {
      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.icon).toBeDefined();
      expect(item.description).toBeDefined();
    }
  });

  it("does not include content or suggestedTags (lightweight)", () => {
    const list = listTemplates();
    for (const item of list) {
      expect(item).not.toHaveProperty("content");
      expect(item).not.toHaveProperty("suggestedTags");
    }
  });

  it("preserves the order of the template registry", () => {
    const list = listTemplates();
    for (let i = 0; i < list.length; i++) {
      expect(list[i].id).toBe(POST_TEMPLATES[i].id);
    }
  });
});
