import { useEffect } from "react";
import { motion } from "framer-motion";

// On-brand opening experience. Uses the real Tangent logo over a deep navy
// field with soft animated glow rings. Calm, premium, professional — matches
// the logo's geometry rather than fighting it.
export default function WelcomeScreen({ onDone, name }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "radial-gradient(1200px 800px at 50% 40%, #06243a 0%, #04101a 60%, #020a12 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.4], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
          style={{ position: "absolute", height: 360, width: 360, borderRadius: "50%", border: "1px solid rgba(24,144,204,0.4)" }} />
      ))}

      <motion.img
        src="/tangent-logo.png" alt="Tangent Landscape Architecture"
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: 200, width: "auto", objectFit: "contain", position: "relative", zIndex: 2, filter: "drop-shadow(0 8px 40px rgba(24,144,204,0.35))" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
        style={{ position: "relative", zIndex: 2, textAlign: "center", marginTop: 24 }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
          Tangent <span style={{ color: "#1890cc" }}>Insight</span>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          style={{ fontSize: 13, color: "rgba(176,192,208,0.85)", marginTop: 6 }}>
          {name ? `Welcome back, ${name.split(" ")[0]}` : "BIM Intelligence Platform"}
        </motion.div>
        <div style={{ width: 180, height: 2.5, borderRadius: 3, background: "rgba(255,255,255,0.08)", margin: "28px auto 0", overflow: "hidden" }}>
          <motion.div initial={{ x: "-100%" }} animate={{ x: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
            style={{ width: "55%", height: "100%", background: "linear-gradient(90deg, transparent, #1890cc, transparent)" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
