import { motion } from "framer-motion";
import { Icon, Avatar } from "./primitives.jsx";
import { spring } from "../motion/variants.js";

const NAV = [
  { id: "dashboard", label: "Executive Dashboard", icon: "LayoutDashboard" },
  { id: "revit", label: "Project Monitoring", icon: "Box" },
  { id: "projects", label: "Projects", icon: "FolderKanban" },
  { id: "live", label: "Live Users", icon: "Radio" },
  { id: "teams", label: "Teams Activity", icon: "Video" },
  { id: "employees", label: "Employee Overview", icon: "Users" },
  { id: "attendance", label: "Attendance", icon: "CalendarCheck" },
  { id: "analytics", label: "Work Analytics", icon: "TrendingUp" },
  { id: "reports", label: "Reports & Export", icon: "FileBarChart" },
  { id: "history", label: "Activity History", icon: "History" },
  { id: "admin", label: "Autodesk ID Manager", icon: "KeyRound" },
  { id: "settings", label: "Settings", icon: "Settings" },
];

export function Sidebar({ route, setRoute, me }) {
  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 248, zIndex: 20,
      display: "flex", flexDirection: "column", padding: "20px 14px",
      background: "rgb(var(--bg-elev) / 0.6)", backdropFilter: "blur(20px)",
      borderRight: "1px solid rgb(var(--border) / 0.5)",
    }}>
      <div className="row gap-3" style={{ padding: "4px 8px 20px" }}>
        <img src="/tangent-mark.png" alt="Tangent" style={{ height: 34, width: "auto", objectFit: "contain" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>Tangent <span style={{ color: "rgb(var(--accent))" }}>Insight</span></div>
          <div className="muted" style={{ fontSize: 10 }}>BIM Intelligence</div>
        </div>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }} className="no-scrollbar">
        {NAV.map((item) => {
          const active = route === item.id;
          return (
            <button key={item.id} onClick={() => setRoute(item.id)}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 11,
                padding: "9px 12px", borderRadius: 10, fontSize: 13,
                color: active ? "rgb(var(--fg))" : "rgb(var(--fg-muted))",
                fontWeight: active ? 600 : 500 }}>
              {active && (
                <motion.div layoutId="nav-active" transition={spring.snappy}
                  style={{ position: "absolute", inset: 0, borderRadius: 10,
                    background: "rgb(var(--accent) / 0.12)", border: "1px solid rgb(var(--accent) / 0.2)" }} />
              )}
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon name={item.icon} size={16} color={active ? "rgb(var(--accent))" : undefined} />
              </span>
              <span style={{ position: "relative" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="row gap-3" style={{ padding: "12px 8px 0", borderTop: "1px solid rgb(var(--hairline))", marginTop: 8 }}>
        <Avatar name={me?.name || "User"} initials={me?.initials} size={34} discipline={me?.discipline} status={me?.status} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{me?.name || "Signed in"}</div>
          <div className="truncate muted" style={{ fontSize: 10.5 }}>{me?.role || "—"}</div>
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title, subtitle, theme, setTheme, motionQuality, cycleMotion, onSignOut, refresh, live }) {
  return (
    <div className="between" style={{ marginBottom: 22 }}>
      <div>
        <motion.h1 className="h1"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {title}
        </motion.h1>
        {subtitle && <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div className="row gap-2">
        <div className="pill pill-neutral" title="Live connection status">
          <span className="dot" style={{ background: live === true ? "rgb(var(--success))" : live === false ? "rgb(var(--danger))" : "rgb(var(--warning))" }} />
          {live === true ? "Live" : live === false ? "Offline" : "Connecting"}
        </div>
        <button className="btn btn-ghost btn-icon" title="Refresh" onClick={refresh}><Icon name="RefreshCw" size={15} /></button>
        <button className="btn btn-ghost btn-sm" title="Motion quality" onClick={cycleMotion}>
          <Icon name="Sparkles" size={14} /> {motionQuality === "high" ? "Cinematic" : motionQuality === "mid" ? "Balanced" : motionQuality === "low" ? "Light" : "Minimal"}
        </button>
        <button className="btn btn-ghost btn-icon" title="Theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <Icon name={theme === "dark" ? "Sun" : "Moon"} size={15} />
        </button>
        <button className="btn btn-ghost btn-icon" title="Sign out" onClick={onSignOut}><Icon name="LogOut" size={15} /></button>
      </div>
    </div>
  );
}
