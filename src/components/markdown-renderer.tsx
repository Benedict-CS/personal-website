"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Components } from "react-markdown";
import "highlight.js/styles/atom-one-light.css";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  postId?: string; // 用於保存 checkbox 狀態
  editable?: boolean; // 是否允許編輯 checkbox
}

export function MarkdownRenderer({ content, postId, editable = false }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [checkboxStates, setCheckboxStates] = useState<Record<number, boolean>>({});
  const [currentContent, setCurrentContent] = useState(content);
  const checkboxCounterRef = React.useRef(0);

  // 當 content 變化時重置
  useEffect(() => {
    setCurrentContent(content);
    setCheckboxStates({});
    checkboxCounterRef.current = 0; // 重置計數器
  }, [content]);

  // 處理 checkbox toggle（保存到 DB）
  const handleCheckboxToggle = async (checkboxIndex: number, checked: boolean) => {
    // 先更新本地狀態（即時反饋）
    setCheckboxStates((prev) => ({
      ...prev,
      [checkboxIndex]: checked,
    }));

    // 如果有 postId 且允許編輯，保存到 DB
    if (postId && editable) {
      try {
        const response = await fetch(`/api/posts/${postId}/checkbox`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkboxIndex,
            checked,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentContent(data.content); // 更新內容以保持同步
        }
      } catch (error) {
        console.error("Failed to save checkbox:", error);
        // 失敗時恢復狀態
        setCheckboxStates((prev) => ({
          ...prev,
          [checkboxIndex]: !checked,
        }));
      }
    }
  };


  // 動態注入樣式來強制覆蓋 highlight.js - 讓背景透明
  useEffect(() => {
    const styleId = "hljs-override";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    // 讓 .hljs 背景完全透明，只使用 pre 的背景色
    styleEl.textContent = `
      pre code.hljs,
      pre .hljs {
        background-color: transparent !important;
        background: transparent !important;
        color: inherit !important;
      }
      pre code.hljs *,
      pre .hljs * {
        background-color: transparent !important;
        background: transparent !important;
      }
    `;
  }, []);

  const handleCopyCode = async (code: string, codeId: string) => {
    try {
      // 優先使用 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback: 使用傳統方法
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }
        document.body.removeChild(textArea);
      }
      setCopiedCode(codeId);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
      // 如果都失敗，嘗試 fallback
      try {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedCode(codeId);
        setTimeout(() => {
          setCopiedCode(null);
        }, 2000);
      } catch (fallbackError) {
        console.error("Fallback copy also failed:", fallbackError);
      }
    }
  };

  // 在每次渲染開始時重置計數器
  checkboxCounterRef.current = 0;

  const components: Components = {
    pre: ({ children, ...props }) => {
      // 處理 code block 類型
      let codeString = "";

      // 提取程式碼內容
      if (children) {
        // 處理單一 ReactElement
        if (React.isValidElement(children)) {
          const codeBlock = children as React.ReactElement<{ children?: React.ReactNode }>;
          const blockChildren = codeBlock.props?.children;
          
          if (typeof blockChildren === "string") {
            codeString = blockChildren;
          } else if (Array.isArray(blockChildren)) {
            codeString = blockChildren
              .map((child: React.ReactNode) => {
                if (typeof child === "string") return child;
                if (React.isValidElement(child)) {
                  const childElement = child as React.ReactElement<{ children?: React.ReactNode }>;
                  const childContent = childElement.props?.children;
                  if (typeof childContent === "string") {
                    return childContent;
                  }
                  if (Array.isArray(childContent)) {
                    return childContent
                      .map((c: React.ReactNode) => (typeof c === "string" ? c : ""))
                      .join("");
                  }
                }
                return "";
              })
              .join("");
          } else if (React.isValidElement(blockChildren)) {
            const nestedElement = blockChildren as React.ReactElement<{ children?: React.ReactNode }>;
            const nestedContent = nestedElement.props?.children;
            if (typeof nestedContent === "string") {
              codeString = nestedContent;
            }
          }
        } else if (Array.isArray(children)) {
          // 處理陣列
          codeString = children
            .map((child: React.ReactNode) => {
              if (typeof child === "string") return child;
              if (React.isValidElement(child)) {
                const childElement = child as React.ReactElement<{ children?: React.ReactNode }>;
                const childContent = childElement.props?.children;
                if (typeof childContent === "string") return childContent;
              }
              return "";
            })
            .join("");
        } else if (typeof children === "string") {
          codeString = children;
        }
      }

      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
      const isCopied = copiedCode === codeId;

      return (
        <div className="relative group">
          <pre
            {...props}
            className="bg-slate-50 text-slate-800 p-4 rounded-lg mb-4 border border-slate-200 [&_code]:!bg-transparent [&_code]:!text-inherit [&_.hljs]:!bg-transparent [&_.hljs]:!text-inherit"
            style={{
              overflowX: "auto",
              overflowY: "hidden",
              whiteSpace: "pre",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {children}
          </pre>
          {codeString && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700/80 hover:bg-slate-600/80 text-white z-10"
              onClick={() => handleCopyCode(codeString, codeId)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
              }}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      );
    },
    code: ({ className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;

      if (isInline) {
        return (
          <code
            className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table: ({ children, ...props }) => {
      return (
        <div className="overflow-x-auto my-4">
          <table
            {...props}
            className="min-w-full border-collapse border border-slate-300"
          >
            {children}
          </table>
        </div>
      );
    },
    thead: ({ children, ...props }) => {
      return (
        <thead {...props} className="bg-slate-100">
          {children}
        </thead>
      );
    },
    tbody: ({ children, ...props }) => {
      return <tbody {...props}>{children}</tbody>;
    },
    tr: ({ children, ...props }) => {
      return (
        <tr {...props} className="border-b border-slate-300">
          {children}
        </tr>
      );
    },
    th: ({ children, ...props }) => {
      return (
        <th
          {...props}
          className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-900"
        >
          {children}
        </th>
      );
    },
    ul: ({ children, ...props }) => {
      return (
        <ul
          {...props}
          className="list-disc list-outside ml-6 my-4 space-y-2"
        >
          {children}
        </ul>
      );
    },
    ol: ({ children, ...props }) => {
      return (
        <ol
          {...props}
          className="list-decimal list-outside ml-6 my-4 space-y-2"
        >
          {children}
        </ol>
      );
    },
    li: ({ children, ...props }) => {
      return (
        <li
          {...props}
          className="text-slate-700"
        >
          {children}
        </li>
      );
    },
    td: ({ children, ...props }) => {
      // 提取第一個文字節點檢查 checkbox
      let firstText = "";
      if (typeof children === 'string') {
        firstText = children;
      } else if (Array.isArray(children) && children.length > 0) {
        const first = children[0];
        if (typeof first === 'string') {
          firstText = first;
        }
      }

      // 檢查是否以 [ ] 或 [x] 開頭
      const checkboxMatch = firstText.match(/^\s*\[([xX ])\]\s*/);
      
      if (checkboxMatch) {
        const isChecked = checkboxMatch[1].toLowerCase() === 'x';
        const checkboxIndex = checkboxCounterRef.current++;
        const currentState = checkboxStates[checkboxIndex] ?? isChecked;

        // 移除 checkbox 標記，保留剩餘內容
        let remainingContent: React.ReactNode = children;
        let isAloneCheckbox = false;

        if (typeof children === 'string') {
          const cleaned = children.replace(/^\s*\[([xX ])\]\s*/, '');
          remainingContent = cleaned;
          // 如果移除後為空，表示只有 checkbox（居中顯示）
          if (!cleaned.trim()) {
            isAloneCheckbox = true;
          }
        } else if (Array.isArray(children)) {
          // 移除第一個元素的 checkbox 部分
          const firstChild = children[0];
          if (typeof firstChild === 'string') {
            const updated = firstChild.replace(/^\s*\[([xX ])\]\s*/, '');
            remainingContent = [updated, ...children.slice(1)];
          }
        }

        // 如果只有單獨的 checkbox（居中）
        if (isAloneCheckbox) {
          return (
            <td
              {...props}
              className="border border-slate-300 px-4 py-2 text-center"
            >
              <input
                type="checkbox"
                checked={currentState}
                onChange={(e) => {
                  handleCheckboxToggle(checkboxIndex, e.target.checked);
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </td>
          );
        }

        // Checkbox + 剩餘內容（link、emoji 等）
        return (
          <td
            {...props}
            className="border border-slate-300 px-4 py-2 text-slate-700"
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={currentState}
                onChange={(e) => {
                  handleCheckboxToggle(checkboxIndex, e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              <div>{remainingContent}</div>
            </div>
          </td>
        );
      }

      return (
        <td
          {...props}
          className="border border-slate-300 px-4 py-2 text-slate-700"
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className="prose prose-lg max-w-none overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
