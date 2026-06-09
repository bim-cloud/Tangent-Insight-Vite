import { motion } from "framer-motion";

// Animated architectural / BIM sketch layer.
// Used on BOTH the login page and as the dashboard background (replacing the
// old WebGL particle "bubbles"). Pure SVG line-art: crisp, light, and elegant.
// Includes a self-drawing "drafting pen" effect, BIM coordination lines,
// landscape contours, a drawing sheet, and softly drifting overlays.
//
// `variant="dashboard"` makes it fixed/full-screen and even fainter so content
// stays readable; `variant="login"` is the richer version for the auth page.
export default function ArchBackground({ variant = "login", theme = "light" }) {
  const navy = "#00243c";
  const blue = "#1890cc";
  const dash = variant === "dashboard";
  const dark = theme === "dark";

  // On dark dashboards, strokes need to be light to read.
  const strokeMain = dark ? "#3db5e8" : navy;
  const strokeBlue = dark ? "#1890cc" : blue;
  const baseOpacity = dash ? (dark ? 0.5 : 0.42) : 0.5;
  const bg = dash ? "transparent" : "#ffffff";

  const wrapStyle = dash
    ? { position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none", background: bg }
    : { position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", background: bg };

  return (
    <div aria-hidden style={wrapStyle}>
      {/* faint brand wash */}
      <div style={{
        position: "absolute", inset: 0,
        background: dark
          ? "radial-gradient(900px 600px at 18% 30%, rgba(24,144,204,0.10), transparent 60%), radial-gradient(800px 600px at 85% 75%, rgba(0,60,100,0.08), transparent 60%)"
          : "radial-gradient(900px 600px at 18% 30%, rgba(24,144,204,0.06), transparent 60%), radial-gradient(800px 600px at 85% 75%, rgba(0,36,60,0.05), transparent 60%)",
      }} />

      {/* Layer 1 — site-plan rings + contours, slow drift */}
      <motion.svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: "-6%", left: "-10%", width: dash ? "48%" : "70%", height: "auto", opacity: baseOpacity }}
        initial={{ x: 0, y: 0 }} animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}>
        <g fill="none" stroke={strokeMain} strokeWidth="1" opacity="0.18">
          <circle cx="220" cy="220" r="60" /><circle cx="220" cy="220" r="110" />
          <circle cx="220" cy="220" r="165" /><circle cx="220" cy="220" r="225" strokeDasharray="4 6" />
          <line x1="220" y1="-5" x2="220" y2="445" /><line x1="-5" y1="220" x2="445" y2="220" />
          <line x1="60" y1="60" x2="380" y2="380" /><line x1="380" y1="60" x2="60" y2="380" />
        </g>
        <g fill="none" stroke={strokeBlue} strokeWidth="1" opacity="0.16">
          <path d="M500 120 q60 -40 130 -10 t120 30" /><path d="M500 150 q70 -36 140 -6 t120 30" />
          <path d="M500 180 q80 -32 150 -2 t120 30" /><path d="M500 210 q90 -28 160 2 t120 30" />
        </g>
      </motion.svg>

      {/* Layer 2 — drawing sheet + building elevation, opposite drift */}
      <motion.svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", bottom: "-8%", right: "-6%", width: dash ? "40%" : "55%", height: "auto", opacity: baseOpacity }}
        initial={{ x: 0, y: 0 }} animate={{ x: [0, -20, 0], y: [0, 14, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}>
        <g fill="none" stroke={strokeMain} strokeWidth="1" opacity="0.16">
          <rect x="60" y="60" width="480" height="480" />
          <rect x="60" y="60" width="480" height="480" transform="translate(8 8)" opacity="0.5" />
          <rect x="400" y="430" width="140" height="110" />
          <line x1="400" y1="460" x2="540" y2="460" /><line x1="400" y1="490" x2="540" y2="490" /><line x1="400" y1="520" x2="540" y2="520" />
        </g>
        <g fill="none" stroke={strokeBlue} strokeWidth="1.1" opacity="0.2">
          <rect x="120" y="240" width="80" height="180" /><rect x="210" y="180" width="70" height="240" /><rect x="290" y="280" width="90" height="140" />
          <line x1="120" y1="420" x2="380" y2="420" />
          <line x1="210" y1="210" x2="280" y2="210" /><line x1="210" y1="240" x2="280" y2="240" />
          <line x1="210" y1="270" x2="280" y2="270" /><line x1="210" y1="300" x2="280" y2="300" />
          <line x1="232" y1="180" x2="232" y2="420" /><line x1="256" y1="180" x2="256" y2="420" />
        </g>
      </motion.svg>

      {/* Layer 3 — landscape contour strokes drifting across the middle */}
      <motion.svg viewBox="0 0 1000 400" preserveAspectRatio="none"
        style={{ position: "absolute", top: "40%", left: 0, width: "100%", height: "28%", opacity: baseOpacity * 0.85 }}
        initial={{ x: 0 }} animate={{ x: [0, -40, 0] }}
        transition={{ duration: 44, repeat: Infinity, ease: "easeInOut" }}>
        <g fill="none" stroke={strokeBlue} strokeWidth="1" opacity="0.14">
          <path d="M0 200 C200 140 400 260 600 200 S1000 140 1000 200" />
          <path d="M0 240 C220 180 420 300 640 240 S1000 180 1000 240" />
          <path d="M0 160 C180 100 380 220 580 160 S1000 100 1000 160" />
        </g>
      </motion.svg>

      {/* Layer 4 — DRAFTING PEN: a path that draws itself, then resets */}
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: dash ? 0.5 : 0.6 }}>
        <motion.path
          d="M150 480 L150 300 L260 300 L260 200 L420 200 L420 360 L560 360 L560 260 L700 260 L700 420 L840 420"
          fill="none" stroke={strokeBlue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0.5, 0.5, 0.5, 0] }}
          transition={{ duration: 14, times: [0, 0.55, 0.85, 1], repeat: Infinity, ease: "easeInOut" }} />
        {/* pen tip marker following the line start area */}
        <motion.circle r="4" fill={strokeBlue}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0],
            cx: [150, 420, 700, 840], cy: [480, 200, 260, 420] }}
          transition={{ duration: 14, times: [0, 0.4, 0.7, 0.95], repeat: Infinity, ease: "easeInOut" }} />
      </svg>

      {/* Layer 5 — BIM coordination crosshair grid that fades in/out */}
      <motion.svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", top: "12%", right: dash ? "20%" : "12%", width: dash ? "24%" : "30%", height: "auto" }}
        animate={{ opacity: [0.05, 0.18, 0.05] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>
        <g fill="none" stroke={strokeMain} strokeWidth="1" opacity="0.5">
          <circle cx="300" cy="300" r="8" />
          <line x1="300" y1="120" x2="300" y2="480" strokeDasharray="3 5" />
          <line x1="120" y1="300" x2="480" y2="300" strokeDasharray="3 5" />
          <circle cx="300" cy="300" r="120" strokeDasharray="2 8" />
        </g>
      </motion.svg>

      {/* Layer 6 — slow floating dimension dots */}
      <FloatingDots blue={strokeBlue} />

      {/* vignette to keep content/form readable */}
      {!dash && (
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(700px 500px at 50% 50%, rgba(255,255,255,0.7), transparent 70%)" }} />
      )}
    </div>
  );
}

function FloatingDots({ blue }) {
  const dots = [
    { x: "12%", y: "18%", d: 26 }, { x: "78%", y: "22%", d: 32 }, { x: "65%", y: "12%", d: 28 },
    { x: "30%", y: "72%", d: 36 }, { x: "88%", y: "60%", d: 30 }, { x: "20%", y: "55%", d: 34 },
  ];
  return (
    <>
      {dots.map((dt, i) => (
        <motion.div key={i}
          initial={{ opacity: 0.1, y: 0 }}
          animate={{ opacity: [0.08, 0.22, 0.08], y: [0, -12, 0] }}
          transition={{ duration: dt.d, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
          style={{ position: "absolute", left: dt.x, top: dt.y, height: 6, width: 6, borderRadius: "50%", background: blue }}
        />
      ))}
    </>
  );
}
