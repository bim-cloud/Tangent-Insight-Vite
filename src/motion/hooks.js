import { useEffect, useRef } from "react";
import Lenis from "lenis";

// Smooth inertia scrolling across the whole app.
export function useLenis() {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    let raf;
    function loop(time) { lenis.raf(time); raf = requestAnimationFrame(loop); }
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
}

// Magnetic hover: element drifts toward pointer, springs back on leave.
import { useMotionValue, useSpring } from "framer-motion";
export function useMagnetic(strength = 0.3) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = ref.current;
    if (!el || reduce) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const onLeave = () => { x.set(0); y.set(0); };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); };
  }, [strength, x, y]);

  return { ref, style: { x: sx, y: sy } };
}
