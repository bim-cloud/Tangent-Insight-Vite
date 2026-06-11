import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/primitives.jsx";
import { auth } from "../lib/auth.js";
import { spring } from "../motion/variants.js";
import ArchBackground from "./ArchBackground.jsx";

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("password");   // "password" | "magic"
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    if (mode === "magic") {
      const res = await auth.signInWithMagicLink(email);
      setBusy(false);
      if (res.error) setErr(res.error);
      else setSent(true);
    } else {
      const res = await auth.signInWithPassword(email, pw);
      setBusy(false);
      if (res.error) setErr(res.error);
      else onSignedIn?.();
    }
  }

  function switchMode(m) { setMode(m); setErr(""); setSent(false); }

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <ArchBackground />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.soft}
        style={{
          position: "relative", zIndex: 1, width: 880, maxWidth: "100%", minHeight: 480,
          display: "grid", gridTemplateColumns: "1fr 0.85fr", borderRadius: 22, overflow: "hidden",
          background: "rgba(255,255,255,0.86)", backdropFilter: "blur(18px) saturate(1.3)",
          boxShadow: "0 40px 100px -30px rgba(0,36,60,0.35), 0 0 0 1px rgba(0,36,60,0.06)",
        }}
      >
        {/* LEFT — form */}
        <div style={{ padding: "48px 46px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <img src="/tangent-mark.png" alt="Tangent" style={{ height: 46, width: "auto", objectFit: "contain", marginBottom: 22 }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "#00243c" }}>
            Welcome to Tangent <span style={{ color: "#1890cc" }}>Insight</span>
          </h1>
          <p style={{ fontSize: 13, color: "#5a6b78", marginTop: 8, lineHeight: 1.6, maxWidth: 320 }}>
            Seamlessly track project hours, productivity, and team performance in one place.
          </p>

          {sent ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 26, padding: "20px", borderRadius: 12, background: "rgba(24,144,204,0.08)", border: "1px solid rgba(24,144,204,0.2)" }}>
              <div className="row gap-2" style={{ marginBottom: 8 }}>
                <Icon name="MailCheck" size={18} color="#1890cc" />
                <span style={{ fontWeight: 600, fontSize: 14, color: "#00243c" }}>Check your inbox</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#5a6b78", lineHeight: 1.6 }}>
                We sent a secure sign-in link to <b>{email}</b>. Click it to access Tangent Insight — no password needed.
              </p>
              <button onClick={() => switchMode("password")}
                style={{ marginTop: 12, fontSize: 12, color: "#1890cc", fontWeight: 600 }}>
                ← Back to sign in
              </button>
            </motion.div>
          ) : (
            <form onSubmit={submit} style={{ marginTop: 26 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <LoginField icon="Mail" type="email" value={email} onChange={setEmail} placeholder="you@tangentlandscape.com" />
                {mode === "password" && (
                  <LoginField icon="Lock" type="password" value={pw} onChange={setPw} placeholder="Password" />
                )}
                {err && <div style={{ fontSize: 12, color: "#dc2626", padding: "7px 11px", borderRadius: 8, background: "rgba(220,38,38,0.08)" }}>{err}</div>}
                <motion.button whileTap={{ scale: 0.98 }} whileHover={{ y: -1 }} type="submit" disabled={busy}
                  style={{ marginTop: 6, padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 14, color: "#fff",
                    background: "linear-gradient(135deg, #1890cc, #003c6e)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 8px 22px -8px rgba(24,144,204,0.6)", opacity: busy ? 0.7 : 1 }}>
                  {busy ? (mode === "magic" ? "Sending link…" : "Signing in…")
                        : mode === "magic" ? <>Send magic link <Icon name="Sparkles" size={15} /></>
                                           : <>Sign in <Icon name="ArrowRight" size={15} /></>}
                </motion.button>
              </div>

              {/* mode toggle */}
              <div style={{ marginTop: 18, textAlign: "center", fontSize: 12.5, color: "#5a6b78" }}>
                {mode === "password" ? (
                  <>Prefer no password?{" "}
                    <button type="button" onClick={() => switchMode("magic")} style={{ color: "#1890cc", fontWeight: 600 }}>
                      Email me a magic link
                    </button>
                  </>
                ) : (
                  <>Have a password?{" "}
                    <button type="button" onClick={() => switchMode("password")} style={{ color: "#1890cc", fontWeight: 600 }}>
                      Sign in with password
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 22 }}>Secured by Supabase Auth</div>
        </div>

        {/* RIGHT — brand panel */}
        <div style={{ position: "relative", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center",
          background: "linear-gradient(160deg, #00314f 0%, #00243c 60%, #001825 100%)", overflow: "hidden" }}>
          {/* animated rings */}
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: [0.7, 1.5], opacity: [0.4, 0] }}
              transition={{ duration: 3, delay: i * 0.7, repeat: Infinity, ease: "easeOut" }}
              style={{ position: "absolute", height: 220, width: 220, borderRadius: "50%", border: "1px solid rgba(24,144,204,0.4)" }} />
          ))}

          {/* Logo with silver-flare reveal: the light logo fades/scales in,
              then a silver highlight sweeps across it (premium reveal). */}
          <div style={{ position: "relative", zIndex: 1, height: 180, display: "flex", alignItems: "center" }}>
            <motion.img src="/tangent-logo-light.png" alt="Tangent Landscape Architecture"
              initial={{ opacity: 0, scale: 0.92, filter: "brightness(0.6)" }}
              animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
              transition={{ delay: 0.2, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: 170, width: "auto", objectFit: "contain", filter: "drop-shadow(0 6px 26px rgba(24,144,204,0.45))" }} />
            {/* silver flare sweep */}
            <motion.div
              initial={{ x: "-130%" }} animate={{ x: "130%" }}
              transition={{ delay: 0.7, duration: 1.4, ease: "easeInOut" }}
              style={{ position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                mixBlendMode: "screen",
                WebkitMaskImage: "url(/tangent-logo-light.png)", maskImage: "url(/tangent-logo-light.png)",
                WebkitMaskSize: "contain", maskSize: "contain",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                WebkitMaskPosition: "center", maskPosition: "center" }} />
            {/* recurring subtle shimmer */}
            <motion.div
              initial={{ x: "-130%" }} animate={{ x: "130%" }}
              transition={{ delay: 3, duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
              style={{ position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.3) 50%, transparent 58%)",
                mixBlendMode: "screen",
                WebkitMaskImage: "url(/tangent-logo-light.png)", maskImage: "url(/tangent-logo-light.png)",
                WebkitMaskSize: "contain", maskSize: "contain",
                WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                WebkitMaskPosition: "center", maskPosition: "center" }} />
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
            style={{ position: "relative", zIndex: 1, marginTop: 20 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>BIM Intelligence Platform</div>
            <div style={{ color: "rgba(176,200,216,0.8)", fontSize: 12, marginTop: 6 }}>Tangent Landscape Architecture</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function LoginField({ icon, type, value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "inline-flex" }}>
        <Icon name={icon} size={15} />
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
        style={{ width: "100%", padding: "11px 12px 11px 38px", borderRadius: 10, fontSize: 13.5,
          border: "1px solid #dce3ea", background: "rgba(255,255,255,0.9)", color: "#0f172a", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "#1890cc")}
        onBlur={(e) => (e.target.style.borderColor = "#dce3ea")} />
    </div>
  );
}
