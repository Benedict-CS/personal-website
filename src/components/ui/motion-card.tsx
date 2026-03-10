"use client";

import { motion } from "framer-motion";

const staggerOrder = 0.06;
const baseDelay = 0.04;

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: baseDelay + delayIndex * staggerOrder,
      }}
      whileHover={{ scale: 1.01 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
