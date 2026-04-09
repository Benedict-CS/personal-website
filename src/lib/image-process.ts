import sharp from "sharp";

const MAX_WIDTH = 1920;
const WEBP_QUALITY = 85;

/**
 * Resize and compress image for web. GIF is passed through to preserve animation.
 * Raster images (JPEG, PNG, WebP) are resized (max width 1920) and encoded as WebP.
 */
export type ImageVariant = {
  buffer: Buffer;
  fileName: string;
  /** Width descriptor for srcset (e.g. 640, 1280). */
  descriptor: number;
};

export async function processImage(
  buffer: Buffer,
  contentType: string,
  fileName: string
): Promise<{
  buffer: Buffer;
  contentType: string;
  fileName: string;
  width?: number;
  height?: number;
  /** Smaller WebP uploads for responsive srcset (640w, 1280w when source is wider). */
  variants?: ImageVariant[];
}> {
  const isGif = contentType === "image/gif";
  if (isGif) {
    try {
      const meta = await sharp(buffer).metadata();
      return {
        buffer,
        contentType,
        fileName,
        width: meta.width ?? undefined,
        height: meta.height ?? undefined,
      };
    } catch {
      return { buffer, contentType, fileName };
    }
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

    const baseName = fileName.replace(/\.[^.]+$/i, "");
    const out = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    const outMeta = await sharp(out).metadata();
    const finalW = outMeta.width ?? 0;
    const variants: ImageVariant[] = [];
    const targetWidths = [640, 1280] as const;
    for (const tw of targetWidths) {
      if (finalW > tw) {
        try {
          const vBuf = await sharp(buffer)
            .resize(tw, null, { fit: "inside" })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
          variants.push({
            buffer: vBuf,
            fileName: `${baseName}-w${tw}.webp`,
            descriptor: tw,
          });
        } catch {
          /* skip variant */
        }
      }
    }
    return {
      buffer: out,
      contentType: "image/webp",
      fileName: `${baseName}.webp`,
      width: outMeta.width ?? undefined,
      height: outMeta.height ?? undefined,
      variants: variants.length > 0 ? variants : undefined,
    };
  } catch (err) {
    console.warn("Image processing failed, uploading original:", err);
    try {
      const meta = await sharp(buffer).metadata();
      return {
        buffer,
        contentType,
        fileName,
        width: meta.width ?? undefined,
        height: meta.height ?? undefined,
      };
    } catch {
      return { buffer, contentType, fileName };
    }
  }
}
