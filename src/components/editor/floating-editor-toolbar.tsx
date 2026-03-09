"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { InsertMediaModal } from "@/components/insert-media-modal";

type Props = {
  slug: string;
};

type EditableElement = HTMLElement & {
  dataset: DOMStringMap & { inlineField?: string; editorKey?: string };
};

export function FloatingEditorToolbar({ slug }: Props) {
  const { data: session, status } = useSession();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [targetImage, setTargetImage] = useState<HTMLImageElement | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const editedRef = useRef<Record<string, string>>({});
  const imageRef = useRef<Record<string, string>>({});

  const isAuthenticated = status === "authenticated" && !!session;

  const canPersist = useMemo(() => ["home", "contact"].includes(slug), [slug]);

  useEffect(() => {
    if (!isAuthenticated || !enabled) return;

    const root = document.querySelector("[data-editor-canvas]");
    if (!root) return;

    const textNodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-inline-field], h1, h2, h3, h4, p, li, blockquote")
    );
    const imageNodes = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

    const cleanup: Array<() => void> = [];

    textNodes.forEach((node, index) => {
      const editableNode = node as EditableElement;
      const key = editableNode.dataset.inlineField || `auto-${index}`;
      editableNode.dataset.editorKey = key;
      editableNode.contentEditable = "true";
      editableNode.spellcheck = true;
      editableNode.classList.add("editor-inline-target");

      const onInput = () => {
        editedRef.current[key] = editableNode.innerText;
      };
      editableNode.addEventListener("input", onInput);
      cleanup.push(() => {
        editableNode.removeEventListener("input", onInput);
        editableNode.contentEditable = "false";
        editableNode.classList.remove("editor-inline-target");
      });
    });

    imageNodes.forEach((img, index) => {
      const key = img.getAttribute("data-inline-field") || `image-${index}`;
      img.setAttribute("data-editor-key", key);
      img.classList.add("editor-image-target");

      const onClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setTargetImage(img);
        setShowMediaPicker(true);
      };
      img.addEventListener("click", onClick);
      cleanup.push(() => {
        img.removeEventListener("click", onClick);
        img.classList.remove("editor-image-target");
      });
    });

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [enabled, isAuthenticated]);

  if (status === "loading" || !isAuthenticated) return null;

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const maxX = Math.max(8, window.innerWidth - 360);
    const maxY = Math.max(8, window.innerHeight - 220);
    setPosition({
      x: Math.max(8, Math.min(maxX, event.clientX - dragRef.current.dx)),
      y: Math.max(8, Math.min(maxY, event.clientY - dragRef.current.dy)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  const persist = async (publish: boolean) => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/editor/inline-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          publish,
          textEdits: editedRef.current,
          imageEdits: imageRef.current,
        }),
      });
      if (!res.ok) {
        setMessage("Save failed.");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; persisted?: boolean };
      if (!data.ok) {
        setMessage("Save failed.");
        return;
      }
      setMessage(data.persisted ? (publish ? "Published." : "Saved.") : "Saved locally. Persistence is not available for this page.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        data-testid="floating-editor-toolbar"
        className="fixed z-[80] w-[340px] rounded-xl border border-slate-300 bg-white shadow-xl"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <div
          className={`cursor-move rounded-t-xl border-b border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ${
            dragging ? "select-none" : ""
          }`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        >
          Editor mode: {slug}
        </div>
        <div className="space-y-3 p-3">
          <p className="text-xs text-slate-600">
            Directly edit text on the page. Click an image to replace it from Media.
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant={enabled ? "default" : "outline"} size="sm" onClick={() => setEnabled((v) => !v)}>
              {enabled ? "Editing on" : "Editing off"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMediaPicker(true)}>
              Media Manager
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={() => persist(false)} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => persist(true)} disabled={saving}>
              Save & Publish
            </Button>
          </div>
          {!canPersist && (
            <p className="text-xs text-amber-700">
              This page is editable in canvas mode, but structured persistence is currently enabled for Home and Contact.
            </p>
          )}
          {message ? <p className="text-xs text-slate-700">{message}</p> : null}
        </div>
      </div>

      <InsertMediaModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          if (!targetImage) return;
          const key = targetImage.getAttribute("data-editor-key") || targetImage.getAttribute("data-inline-field");
          targetImage.src = url;
          if (key) {
            imageRef.current[key] = url;
          }
          setShowMediaPicker(false);
          setTargetImage(null);
        }}
      />
    </>
  );
}
