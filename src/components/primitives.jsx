import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { registerToast } from "../lib/util.js";

// ---- Icon (lucide) ----
export function Icon({ name, size = 16, color, strokeWidth = 2, style }) {
  const C = Icons[name] || Icons.Circle;
  return <C size={size} color={color} strokeWidth={strokeWidth} style={style} />;
}

// ---- Animated counter ----
export function Counter({ value, decimals, suffix = "" }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const dec = decimals != null ? decimals : (Number.isInteger(value) ? 0 : 1);
  useEffect(() => {
    const controls = animate(mv, value || 0, {
      duration: 1.1, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })),
    });
    return () => controls.stop();
  }, [value, dec, mv]);
  return <span>{display}{suffix}</span>;
}

// ---- Pill ----
export function Pill({ tone = "neutral", dot, children }) {
  return (
    <span className={`pill pill-${tone}`}>
      {dot && <span className="dot" style={{ background: "currentColor" }} />}
      {children}
    </span>
  );
}

// ---- Avatar ----
const DISC_COLORS = {
  MANAGER: "var(--grad-violet)", COORDINATOR: "var(--grad-cyan)",
  MODELER: "var(--grad-emerald)", DETAILER: "var(--grad-amber)",
  UNASSIGNED: "linear-gradient(135deg,#64748b,#475569)",
};
export function Avatar({ name, initials, size = 36, discipline = "UNASSIGNED", status }) {
  const ring = status === "online" ? "var(--success)" : status === "meeting" ? "var(--accent-2)"
    : status === "idle" ? "var(--warning)" : "transparent";
  return (
    <div style={{ position: "relative", flex: "none" }}>
      <div style={{
        height: size, width: size, borderRadius: "50%", background: DISC_COLORS[discipline] || DISC_COLORS.UNASSIGNED,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 600, fontSize: size * 0.36,
      }}>
        {initials || (name || "?").slice(0, 2).toUpperCase()}
      </div>
      {status && status !== "offline" && (
        <span style={{
          position: "absolute", bottom: 0, right: 0, height: size * 0.28, width: size * 0.28,
          borderRadius: "50%", background: `rgb(${ring.includes("success") ? "16 185 129" : ring.includes("accent-2") ? "167 139 250" : "245 158 11"})`,
          border: "2px solid rgb(var(--bg))",
        }} />
      )}
    </div>
  );
}

// ---- Sparkline (inline SVG) ----
export function Sparkline({ data = [], width = 72, height = 24, color = "rgb(var(--accent))", strokeWidth = 1.5 }) {
  if (!data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <motion.polyline
        points={pts} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

// ---- Toast system ----
const ToastCtx = createContext(null);
export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  useEffect(() => { registerToast(push); }, [push]);

  const colors = { success: "16 185 129", warning: "245 158 11", danger: "239 68 68", info: "14 165 183" };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              style={{
                minWidth: 200, maxWidth: 340, padding: "11px 14px", borderRadius: 12,
                background: "rgba(15,23,42,0.94)", color: "#fff", fontSize: 12.5, fontWeight: 500,
                boxShadow: "0 12px 30px -12px rgba(0,0,0,0.5)", borderLeft: `3px solid rgb(${colors[t.kind]})`,
                backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10,
              }}>
              <span style={{ height: 8, width: 8, borderRadius: "50%", background: `rgb(${colors[t.kind]})`, flex: "none" }} />
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ---- Card title ----
export function CardTitle({ title, subtitle, icon, right }) {
  return (
    <div className="between" style={{ marginBottom: 14 }}>
      <div className="row gap-3">
        {icon && (
          <div style={{ height: 30, width: 30, borderRadius: 9, background: "rgb(var(--accent) / 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "rgb(var(--accent))" }}>
            <Icon name={icon} size={15} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {subtitle && <div className="muted" style={{ fontSize: 11, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ---- Skeleton ----
export function Skeleton({ h = 16, w = "100%", r = 8, style }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: "linear-gradient(90deg, rgb(var(--fg)/0.04) 25%, rgb(var(--fg)/0.09) 37%, rgb(var(--fg)/0.04) 63%)",
      backgroundSize: "200% 100%", animation: "ti-shimmer 1.4s ease-in-out infinite", ...style,
    }} />
  );
}
