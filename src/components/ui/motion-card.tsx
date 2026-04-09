"use client";

import { motion } from "framer-motion";
import { UI_SPRING_CARD } from "@/components/ui/ui-cohesion";

const staggerOrder = 0.05;
const baseDelay = 0.03;

type MotionCardProps = {
  delayIndex?: number;
  className?: string;
  children?: React.ReactNode;
  id?: string;
};

export function MotionCard({
  delayIndex = 0,
  className,
  children,
  id,
}: MotionCardProps) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        ...UI_SPRING_CARD,
        delay: baseDelay + delayIndex * staggerOrder,
      }}
      whileHover={{ scale: 1.008, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
