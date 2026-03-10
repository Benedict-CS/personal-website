"use client";

const GA_SCRIPT = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '__GA_ID__');`;

export function GoogleAnalyticsScript({ measurementId }: { measurementId: string }) {
  const id = measurementId.trim();
  if (!id) return null;
  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  const scriptContent = GA_SCRIPT.replace("__GA_ID__", id.replace(/'/g, "\\'"));
  return (
    <>
      <script async src={src} />
      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </>
  );
}
