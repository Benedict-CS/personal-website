import { markdownImageFromMediaFile } from "@/lib/cms-media-insert";

describe("cms-media-insert", () => {
  it("builds markdown image with cleaned alt text", () => {
    const markdown = markdownImageFromMediaFile("1712345678901-my_project-shot.png", "/media/img.png");
    expect(markdown).toBe("![my project shot](/media/img.png)");
  });
});
