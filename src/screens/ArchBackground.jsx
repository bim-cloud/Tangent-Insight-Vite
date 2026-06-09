import { motion } from "framer-motion";

// Softly animated architectural / landscape drawing layer for the login page.
// Pure SVG line-art (crisp at any resolution, very light). Elements drift and
// breathe slowly at low opacity — depth without distraction. Works on a white
// background; the strokes use the Tangent navy/blue at low alpha.
export default function ArchBackground() {
  const navy = "#00243c";
  const blue = "#1890cc";

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", background: "#ffffff" }}>
      {/* faint brand wash */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(900px 600px at 18% 30%, rgba(24,144,204,0.06), transparent 60%), radial-gradient(800px 600px at 85% 75%, rgba(0,36,60,0.05), transparent 60%)",
      }} />

      {/* Layer 1 — large site-plan circles + contour lines, slow drift */}
      <motion.svg
        viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: "-6%", left: "-10%", width: "70%", height: "auto", opacity: 0.5 }}
        initial={{ x: 0, y: 0 }} animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      >
        <g fill="none" stroke={navy} strokeWidth="1" opacity="0.18">
          {/* concentric site rings */}
          <circle cx="220" cy="220" r="60" />
          <circle cx="220" cy="220" r="110" />
          <circle cx="220" cy="220" r="165" />
          <circle cx="220" cy="220" r="225" strokeDasharray="4 6" />
          {/* radial spokes */}
          <line x1="220" y1="-5" x2="220" y2="445" />
          <line x1="-5" y1="220" x2="445" y2="220" />
          <line x1="60" y1="60" x2="380" y2="380" />
          <line x1="380" y1="60" x2="60" y2="380" />
        </g>
        {/* contour topography */}
        <g fill="none" stroke={blue} strokeWidth="1" opacity="0.16">
          <path d="M500 120 q60 -40 130 -10 t120 30" />
          <path d="M500 150 q70 -36 140 -6 t120 30" />
          <path d="M500 180 q80 -32 150 -2 t120 30" />
          <path d="M500 210 q90 -28 160 2 t120 30" />
        </g>
      </motion.svg>

      {/* Layer 2 — building elevation / sheet grid, opposite drift */}
      <motion.svg
        viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", bottom: "-8%", right: "-6%", width: "55%", height: "auto", opacity: 0.5 }}
        initial={{ x: 0, y: 0 }} animate={{ x: [0, -20, 0], y: [0, 14, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* sheet border + title block */}
        <g fill="none" stroke={navy} strokeWidth="1" opacity="0.16">
          <rect x="60" y="60" width="480" height="480" />
          <rect x="60" y="60" width="480" height="480" transform="translate(8 8)" opacity="0.5" />
          <rect x="400" y="430" width="140" height="110" />
          <line x1="400" y1="460" x2="540" y2="460" />
          <line x1="400" y1="490" x2="540" y2="490" />
          <line x1="400" y1="520" x2="540" y2="520" />
        </g>
        {/* elevation massing */}
        <g fill="none" stroke={blue} strokeWidth="1.1" opacity="0.2">
          <rect x="120" y="240" width="80" height="180" />
          <rect x="210" y="180" width="70" height="240" />
          <rect x="290" y="280" width="90" height="140" />
          <line x1="120" y1="420" x2="380" y2="420" />
          {/* windows grid on tallest block */}
          <line x1="210" y1="210" x2="280" y2="210" /><line x1="210" y1="240" x2="280" y2="240" />
          <line x1="210" y1="270" x2="280" y2="270" /><line x1="210" y1="300" x2="280" y2="300" />
          <line x1="232" y1="180" x2="232" y2="420" /><line x1="256" y1="180" x2="256" y2="420" />
        </g>
      </motion.svg>

      {/* Layer 3 — drifting landscape contour strokes across the middle */}
      <motion.svg
        viewBox="0 0 1000 400" preserveAspectRatio="none"
        style={{ position: "absolute", top: "38%", left: 0, width: "100%", height: "30%", opacity: 0.4 }}
        initial={{ x: 0 }} animate={{ x: [0, -40, 0] }}
        transition={{ duration: 44, repeat: Infinity, ease: "easeInOut" }}
      >
        <g fill="none" stroke={blue} strokeWidth="1" opacity="0.14">
          <path d="M0 200 C200 140 400 260 600 200 S1000 140 1000 200" />
          <path d="M0 240 C220 180 420 300 640 240 S1000 180 1000 240" />
          <path d="M0 160 C180 100 380 220 580 160 S1000 100 1000 160" />
        </g>
      </motion.svg>

      {/* Layer 4 — slow floating dimension/leader dots */}
      <FloatingDots />

      {/* subtle vignette so the form area stays clean */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(700px 500px at 50% 50%, rgba(255,255,255,0.7), transparent 70%)",
      }} />
    </div>
  );
}

function FloatingDots() {
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
          style={{ position: "absolute", left: dt.x, top: dt.y, height: 6, width: 6, borderRadius: "50%", background: "#1890cc" }}
        />
      ))}
    </>
  );
}
