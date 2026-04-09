import React from "react";
import { extractCodeTextFromPreChildren } from "@/components/markdown/extract-pre-code-text";

describe("extractCodeTextFromPreChildren", () => {
  it("joins Shiki-style span.line segments with newlines", () => {
    const tree = (
      <code className="language-ts shiki">
        <span className="line">
          <span style={{ color: "#f00" }}>const</span> x = 1;
        </span>
        <span className="line">
          <span>console.log(x);</span>
        </span>
      </code>
    );
    const text = extractCodeTextFromPreChildren(tree);
    expect(text).toBe("const x = 1;\nconsole.log(x);\n");
  });

  it("handles plain string children (hljs-style)", () => {
    expect(extractCodeTextFromPreChildren("hello\nworld")).toBe("hello\nworld");
  });
});
