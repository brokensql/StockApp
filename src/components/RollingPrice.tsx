import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

interface RollingPriceProps {
  value: number;
  triggerKey?: number;
  isHidden?: boolean;
  prefix?: string;
  duration?: number;
  className?: string;
}

// Cubic ease-out curve for smooth number rolling animation
function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export const RollingPrice: React.FC<RollingPriceProps> = ({
  value,
  triggerKey = 0,
  isHidden = false,
  prefix = '₱',
  duration = 900,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isHidden) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Reset to 0 when triggerKey changes, then roll up to target value
    setDisplayValue(0);

    const startTime = performance.now();
    const startVal = 0;
    const endVal = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentVal = startVal + (endVal - startVal) * easedProgress;

      setDisplayValue(currentVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, triggerKey, isHidden, duration]);

  if (isHidden) {
    return (
      <span className={`tabular-nums select-none ${className}`}>
        {prefix}
        <span className="tracking-widest ml-0.5 text-[0.85em] align-middle">••••••</span>
      </span>
    );
  }

  const formatted = `${prefix}${displayValue.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <motion.span
      key={triggerKey}
      initial={{ opacity: 0.85, y: 1 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`tabular-nums ${className}`}
    >
      {formatted}
    </motion.span>
  );
};
