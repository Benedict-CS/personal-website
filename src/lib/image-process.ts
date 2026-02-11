import sharp from "sharp";

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 85;

/**
 * Resize and compress image for web. GIF is passed through to preserve animation.
 * JPEG/PNG/WebP are resized (max width 1920) and converted to WebP.
 */
export async function processImage(
  buffer: Buffer,
  contentType: string,
  fileName: string
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const isGif = contentType === "image/gif";
  if (isGif) {
    return { buffer, contentType, fileName };
  }

  const supported = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!supported.includes(contentType)) {
    return { buffer, contentType, fileName };
  }

  try {
    let pipeline = sharp(buffer);
    const meta = await pipeline.metadata();
    const width = meta.width ?? 0;
    const shouldResize = width > MAX_WIDTH;

    if (shouldResize) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { fit: "inside" });
    }
    const out = await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const baseName = fileName.replace(/\.[^.]+$/, "");
    const newFileName = `${baseName}.webp`;
    return {
      buffer: out,
      contentType: "image/webp",
      fileName: newFileName,
    };
  } catch (err) {
    console.warn("Image processing failed, uploading original:", err);
    return { buffer, contentType, fileName };
  }
}
