// Shared Framer Motion configuration — spring presets and reusable variants.

export const spring = {
  soft:   { type: "spring", stiffness: 170, damping: 22, mass: 1 },
  snappy: { type: "spring", stiffness: 320, damping: 28 },
  gentle: { type: "spring", stiffness: 110, damping: 20 },
  bouncy: { type: "spring", stiffness: 260, damping: 14 },
};

// Cinematic page transition (enter / exit)
export const pageVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(6px)", scale: 0.99 },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], when: "beforeChildren", staggerChildren: 0.05 } },
  exit: { opacity: 0, y: -12, filter: "blur(4px)", scale: 0.995,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
};

// Children rise into place
export const riseItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// Stagger container for grids
export const staggerGrid = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: spring.soft },
};

// Hover/tap presets for interactive cards
export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.012, transition: spring.snappy },
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};
