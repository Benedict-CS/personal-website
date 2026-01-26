import { stripMarkdown } from "./utils";

/**
 * 計算閱讀時間（分鐘）
 * 英文：200-250 words/min
 * 中文：300-400 characters/min
 * 混合內容：使用單詞數計算（更準確）
 */
export function calculateReadingTime(content: string): number {
  const plainText = stripMarkdown(content);
  
  // 計算單詞數（英文以空格分隔，中文以字元計算）
  // 簡單方式：英文單詞數 + 中文字元數
  const words = plainText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
  
  // 計算中文字元數（非 ASCII 字元）
  const chineseChars = (plainText.match(/[^\x00-\x7F]/g) || []).length;
  
  // 英文閱讀速度：200 words/min
  // 中文閱讀速度：300 characters/min
  const englishReadingTime = words / 200;
  const chineseReadingTime = chineseChars / 300;
  
  const totalReadingTime = englishReadingTime + chineseReadingTime;
  return Math.max(1, Math.ceil(totalReadingTime)); // 至少 1 分鐘
}

/**
 * 格式化閱讀時間顯示
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return "1 min read";
  }
  return `${minutes} min read`;
}
