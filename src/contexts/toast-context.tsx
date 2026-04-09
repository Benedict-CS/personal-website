"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { UI_MOTION_EASE } from "@/components/ui/ui-cohesion";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: React.ReactNode;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: React.ReactNode, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const reduceMotion = useReducedMotion();

  const toast = useCallback((message: React.ReactNode, type: ToastType = "info") => {
    const currentId = ++id;
    setItems((prev) => [...prev, { id: currentId, message, type }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== currentId));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, x: 16, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.2, ease: UI_MOTION_EASE }
              }
              className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-[var(--elevation-3)] text-sm font-medium ${
                item.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : item.type === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                  : item.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-border bg-card text-foreground"
              }`}
            >
              {item.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
    };
  }
  return ctx;
}
