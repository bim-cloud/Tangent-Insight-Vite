import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/primitives.jsx";
import { auth } from "../lib/auth.js";
import { spring } from "../motion/variants.js";

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await auth.signInWithPassword(email, pw);
    setBusy(false);
    if (res.error) setErr(res.error);
    else onSignedIn?.();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", zIndex: 1 }}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.soft}
        className="surface" style={{ width: 400, maxWidth: "100%", padding: 32 }}>
        <div className="row gap-3" style={{ marginBottom: 24 }}>
          <img src="/tangent-mark.png" alt="Tangent" style={{ height: 44, width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Tangent <span style={{ color: "rgb(var(--accent))" }}>Insight</span></div>
            <div className="muted" style={{ fontSize: 11.5 }}>BIM Intelligence Platform</div>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="col gap-3">
            <div>
              <div className="micro" style={{ marginBottom: 5 }}>Email</div>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tangentlandscape.com" required />
            </div>
            <div>
              <div className="micro" style={{ marginBottom: 5 }}>Password</div>
              <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
            </div>
            {err && <div style={{ fontSize: 12, color: "rgb(var(--danger))", padding: "6px 10px", borderRadius: 8, background: "rgb(var(--danger)/0.1)" }}>{err}</div>}
            <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: "center", marginTop: 4 }}>
              {busy ? "Signing in…" : <>Sign in <Icon name="ArrowRight" size={14} /></>}
            </motion.button>
          </div>
        </form>
        <div className="muted" style={{ fontSize: 10.5, marginTop: 18, textAlign: "center", lineHeight: 1.6 }}>
          Secured by Supabase Auth · Tangent Landscape Architecture
        </div>
      </motion.div>
    </div>
  );
}
