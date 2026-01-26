"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      
      const scrollableHeight = documentHeight - windowHeight;
      const scrolled = scrollTop;
      
      if (scrollableHeight > 0) {
        const percentage = Math.min(100, (scrolled / scrollableHeight) * 100);
        setProgress(percentage);
      } else {
        setProgress(100);
      }
    };

    // 初始計算
    updateProgress();

    // 監聽滾動事件
    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-50">
      <div
        className="h-full bg-slate-600 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
