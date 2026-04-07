import { isSafeS3ObjectKey } from "@/lib/safe-s3-object-key";

describe("isSafeS3ObjectKey", () => {
  it("allows cv and normal uploads", () => {
    expect(isSafeS3ObjectKey("cv.pdf")).toBe(true);
    expect(isSafeS3ObjectKey("media/photo.png")).toBe(false);
    expect(isSafeS3ObjectKey("x")).toBe(true);
  });

  it("rejects traversal", () => {
    expect(isSafeS3ObjectKey("..")).toBe(false);
    expect(isSafeS3ObjectKey("a/../b")).toBe(false);
  });
});
