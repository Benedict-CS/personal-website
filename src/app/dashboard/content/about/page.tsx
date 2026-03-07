"use client";

import dynamic from "next/dynamic";
import AboutContentLoading from "./loading";

const AboutEditor = dynamic(() => import("./about-editor"), {
  loading: () => <AboutContentLoading />,
});

export default function AboutPage() {
  return <AboutEditor />;
}
