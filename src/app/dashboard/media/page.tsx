"use client";

import dynamic from "next/dynamic";
import MediaLoading from "./loading";

const MediaContent = dynamic(() => import("./media-content"), {
  loading: () => <MediaLoading />,
});

export default function MediaPage() {
  return <MediaContent />;
}
