/**
 * Derives a readable default alt string from an uploaded image filename (e.g. timestamp-stripped).
 */
export function altTextFromImageFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/i, "");
  const withoutLeadingTs = withoutExt.replace(/^\d{10,}-/, "");
  const spaced = withoutLeadingTs.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.length > 0 ? spaced : "Image";
}
