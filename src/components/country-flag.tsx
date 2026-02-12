"use client";

import { useState } from "react";

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  return countryCode
    .toUpperCase()
    .slice(0, 2)
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

/** Country flag: try image from CDN first, fall back to emoji if image fails (e.g. blocked or offline). */
export function CountryFlag({ countryCode }: { countryCode: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const cc = countryCode.trim().toUpperCase();
  if (!cc || cc.length !== 2) return null;

  if (imgFailed) {
    const emoji = getFlagEmoji(cc);
    if (!emoji) return null;
    return (
      <span className="ml-1.5 inline-flex align-middle" title={cc}>
        {emoji}
      </span>
    );
  }

  return (
    <span className="ml-1.5 inline-flex align-middle shrink-0" title={cc}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w80/${cc.toLowerCase()}.png`}
        alt=""
        width={20}
        height={15}
        className="inline-block object-cover"
        onError={() => setImgFailed(true)}
      />
    </span>
  );
}
