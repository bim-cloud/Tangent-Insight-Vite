import { motion } from "framer-motion";
import { Icon, Counter, Sparkline } from "./primitives.jsx";
import { useMagnetic } from "../motion/hooks.js";
import { spring } from "../motion/variants.js";
import { ROUTE_FOR_KPI } from "../lib/data.js";

export default function KPICard({ k, onNavigate }) {
  const mag = useMagnetic(0.16);
  const target = ROUTE_FOR_KPI[k.key];

  return (
    <motion.button
      ref={mag.ref}
      style={mag.style}
      onClick={() => target && onNavigate?.(target)}
      className="surface surface-hover"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
      whileHover={{ y: -4, scale: 1.014, transition: spring.snappy }}
      whileTap={{ scale: 0.985 }}
      aria-label={`${k.label}: ${k.value}. Open details.`}
    >
      <div style={{ padding: "var(--pad-card)", position: "relative", overflow: "hidden", textAlign: "left", borderRadius: "inherit" }}>
        {/* glow */}
        <div style={{
          position: "absolute", top: -42, right: -42, height: 120, width: 120, borderRadius: "50%",
          background: k.grad, opacity: 0.16, filter: "blur(30px)",
        }} />
        <div style={{ position: "relative" }}>
          <div className="between" style={{ marginBottom: 12 }}>
            <motion.div
              whileHover={{ scale: 1.08, rotate: -4 }}
              transition={spring.bouncy}
              style={{
                height: 34, width: 34, borderRadius: 10, background: k.grad,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", boxShadow: "0 6px 16px -6px rgb(0 0 0 / 0.3)",
              }}>
              <Icon name={k.icon} size={17} strokeWidth={2.2} />
            </motion.div>
            <Sparkline data={k.spark} color="rgb(var(--accent))" />
          </div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            <Counter value={k.value} suffix={k.suffix || ""} />
          </div>
          <div className="between" style={{ marginTop: 5 }}>
            <span className="muted truncate" style={{ fontSize: 11.5 }}>{k.label}</span>
            <motion.span
              className="row" style={{ fontSize: 11, fontWeight: 600, color: "rgb(var(--accent))", gap: 2 }}
              initial={{ opacity: 0, x: -4 }} whileHover={{ opacity: 1 }}>
              Open <Icon name="ArrowRight" size={11} />
            </motion.span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
