import { useState, useEffect, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';

interface TextLoopProps {
  children: React.ReactNode;
  className?: string;
  transition?: Transition;
  variants?: Variants;
  interval?: number;
}

export function TextLoop({
  children,
  className = "",
  transition,
  variants,
  interval = 2500
}: TextLoopProps) {
  const [index, setIndex] = useState(0);
  const items = Children.toArray(children);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, interval);
    return () => clearInterval(timer);
  }, [items.length, interval]);

  return (
    <div className={`relative inline-block ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={index}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={transition}
          className="inline-block whitespace-nowrap"
        >
          {items[index]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
