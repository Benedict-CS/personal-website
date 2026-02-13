import sharp from "sharp";

const MAX_WIDTH = 1920;
const JPEG_QUALITY = 85;
const PNG_COMPRESSION = 6; // 0–9, higher = smaller file

/**
 * Resize and compress image for web. Keeps original format (JPEG, PNG, WebP, GIF).
 * GIF is passed through to preserve animation. Others are resized (max width 1920) and compressed.
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

    const ext = fileName.replace(/^.*\.([^.]+)$/i, "$1").toLowerCase();
    const baseName = fileName.replace(/\.[^.]+$/i, "");

    if (contentType === "image/png" || ext === "png") {
      const out = await pipeline.png({ compressionLevel: PNG_COMPRESSION }).toBuffer();
      return {
        buffer: out,
        contentType: "image/png",
        fileName: `${baseName}.png`,
      };
    }
    if (contentType === "image/webp" || ext === "webp") {
      const out = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
      return {
        buffer: out,
        contentType: "image/webp",
        fileName: `${baseName}.webp`,
      };
    }
    // JPEG / jpg
    const out = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
    const jpegExt = ext === "jpeg" ? "jpeg" : "jpg";
    return {
      buffer: out,
      contentType: "image/jpeg",
      fileName: `${baseName}.${jpegExt}`,
    };
  } catch (err) {
    console.warn("Image processing failed, uploading original:", err);
    return { buffer, contentType, fileName };
  }
}
