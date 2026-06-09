import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { Icon, CardTitle, Avatar, Pill } from "../components/primitives.jsx";
import { spring, staggerGrid, riseItem } from "../motion/variants.js";
import { exportAttendanceXlsx } from "../lib/excel.js";
import { exportCsv } from "../lib/util.js";

const card = { padding: "var(--pad-card)" };
const fmtHM = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

// ---------- Per-employee detail drawer ----------
export function EmployeeDrawer({ person, activity, onClose }) {
  if (!person) return null;
  const p = person;
  const userEvents = (activity || []).filter((a) => a.user === p.id).slice(0, 40);
  const totalPc = p.focusMin + p.idleMin;
  const productivePct = totalPc ? Math.round((p.focusMin / totalPc) * 100) : 0;

  // Build a simple hour-bucketed timeline from this user's events
  const buckets = Array.from({ length: 12 }, (_, i) => ({ h: i + 8, count: 0 }));
  userEvents.forEach((e) => { if (e.at) { const h = new Date(e.at).getHours() - 8; if (h >= 0 && h < 12) buckets[h].count++; } });

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }}>
        <motion.div initial={{ x: 460 }} animate={{ x: 0 }} exit={{ x: 460 }} transition={spring.soft}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 460, maxWidth: "92vw", height: "100%", background: "rgb(var(--bg-elev))", overflowY: "auto" }}>
          <div style={{ padding: 24 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <div className="row gap-3">
                <Avatar name={p.name} initials={p.initials} discipline={p.discipline} status={p.status} size={48} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.role} · {p.dept}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="X" size={16} /></button>
            </div>

            {/* status + online since */}
            <div className="row gap-2" style={{ marginBottom: 16 }}>
              <Pill tone={p.status === "online" ? "success" : p.status === "meeting" ? "info" : p.status === "idle" ? "warning" : "neutral"} dot>{p.status}</Pill>
              {p.onlineSince && p.status !== "offline" && <span className="muted" style={{ fontSize: 11.5 }}>online since {new Date(p.onlineSince).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
            </div>

            {/* metric tiles */}
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <DTile label="Active" value={fmtHM(p.focusMin)} tone="success" />
              <DTile label="Idle" value={fmtHM(p.idleMin)} />
              <DTile label="Total PC" value={fmtHM(totalPc)} />
              <DTile label="Productive" value={p.hours.toFixed(1) + "h"} />
              <DTile label="Overtime" value={p.ot.toFixed(1) + "h"} tone={p.ot > 0.5 ? "warning" : undefined} />
              <DTile label="Utilization" value={p.utilization + "%"} tone="accent" />
            </div>

            {/* login/logout */}
            <div className="surface-solid" style={{ ...card, marginBottom: 16 }}>
              <div className="micro" style={{ marginBottom: 8 }}>Login / Logout (today)</div>
              <div className="between" style={{ fontSize: 13 }}>
                <div className="row gap-2"><Icon name="LogIn" size={14} color="rgb(var(--success))" /> {p.loginTime ? new Date(p.loginTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                <div className="row gap-2"><Icon name="LogOut" size={14} color="rgb(var(--fg-muted))" /> {p.logoutTime ? new Date(p.logoutTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
              </div>
              {!p.loginTime && <div className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>Login/logout times appear once the desktop agent reports session boundaries.</div>}
            </div>

            {/* daily activity timeline */}
            <div className="surface-solid" style={{ ...card, marginBottom: 16 }}>
              <div className="micro" style={{ marginBottom: 8 }}>Activity through the day</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={buckets} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="h" tickFormatter={(h) => h + ":00"} tick={{ fill: "rgb(122 142 160)", fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                  <Tooltip cursor={{ fill: "rgba(24,144,204,0.08)" }} content={({ active, payload, label }) => active && payload?.length ? (
                    <div style={{ background: "rgba(12,26,38,0.96)", border: "1px solid rgb(24 144 204 / 0.3)", borderRadius: 8, padding: "6px 10px", fontSize: 11.5 }}>{label}:00 — {payload[0].value} events</div>
                  ) : null} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#1890cc" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* event log */}
            <div className="micro" style={{ marginBottom: 8 }}>Recent activity</div>
            {userEvents.length === 0 ? <div className="muted" style={{ fontSize: 12 }}>No activity captured for this user yet.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {userEvents.map((e) => (
                  <div key={e.id} className="row gap-3" style={{ padding: "6px 0", borderBottom: "1px solid rgb(var(--hairline))" }}>
                    <Icon name={e.kind === "teams" ? "Video" : e.kind === "sync" ? "RefreshCw" : e.kind === "save" ? "Save" : e.kind === "warning" ? "AlertTriangle" : "Circle"} size={12} color="rgb(var(--accent))" />
                    <span style={{ flex: 1, fontSize: 11.5 }}>{e.detail}</span>
                    <span className="muted tabular" style={{ fontSize: 10.5 }}>{e.t < 1 ? "now" : e.t + "m"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
function DTile({ label, value, tone }) {
  const color = tone === "success" ? "rgb(var(--success))" : tone === "warning" ? "rgb(var(--warning))" : tone === "accent" ? "rgb(var(--accent))" : "rgb(var(--fg))";
  return (
    <div style={{ padding: 10, borderRadius: 10, background: "rgb(var(--bg-sunken))" }}>
      <div className="micro" style={{ fontSize: 9 }}>{label}</div>
      <div className="tabular" style={{ fontSize: 17, fontWeight: 700, marginTop: 2, color }}>{value}</div>
    </div>
  );
}

// ---------- Attendance screen ----------
export function AttendanceScreen({ data }) {
  const { people } = data;
  const present = people.filter((p) => p.status !== "offline");
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} variants={staggerGrid}>
        <ATile icon="UserCheck" label="Present" value={present.length} grad="var(--grad-emerald)" />
        <ATile icon="UserX" label="Offline" value={people.length - present.length} grad="var(--grad-navy)" />
        <ATile icon="Clock" label="Total hours" value={people.reduce((a, p) => a + p.hours, 0).toFixed(0) + "h"} grad="var(--grad-cyan)" />
        <ATile icon="Timer" label="Overtime" value={people.reduce((a, p) => a + p.ot, 0).toFixed(1) + "h"} grad="var(--grad-amber)" />
      </motion.div>
      <motion.div className="surface" style={{ ...card, marginTop: 16, padding: 0, overflow: "hidden" }} variants={riseItem}>
        <div className="between" style={{ padding: "14px 16px" }}>
          <CardTitle title="Daily attendance" subtitle="Today · activity-based" icon="CalendarCheck" />
          <button className="btn btn-primary btn-sm" onClick={() => exportAttendanceXlsx(people, { rangeLabel: "Today" })}><Icon name="FileSpreadsheet" size={12} /> Export Excel</button>
        </div>
        <table>
          <thead><tr><th>Employee</th><th>Status</th><th>Login</th><th>Logout</th><th>Active</th><th>Idle</th><th>Working</th><th>Overtime</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td><div className="row gap-2"><Avatar name={p.name} initials={p.initials} discipline={p.discipline} status={p.status} size={26} /><span style={{ fontWeight: 600 }}>{p.name}</span></div></td>
                <td><Pill tone={p.status === "offline" ? "neutral" : "success"} dot>{p.status === "offline" ? "absent" : "present"}</Pill></td>
                <td className="muted tabular" style={{ fontSize: 11 }}>{p.loginTime ? new Date(p.loginTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                <td className="muted tabular" style={{ fontSize: 11 }}>{p.logoutTime ? new Date(p.logoutTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                <td className="tabular" style={{ color: "rgb(var(--success))" }}>{fmtHM(p.focusMin)}</td>
                <td className="tabular muted">{fmtHM(p.idleMin)}</td>
                <td className="tabular">{p.hours.toFixed(1)}h</td>
                <td className="tabular" style={{ color: p.ot > 0.5 ? "rgb(var(--warning))" : "rgb(var(--fg-muted))" }}>{p.ot.toFixed(1)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
      <div className="surface" style={{ ...card, marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
          Active and idle time come from the desktop agent's input tracking. Login/logout reflect the first and last agent sample of the day — these populate once the agent reports session boundaries (a small agent addition).
        </div>
      </div>
    </motion.div>
  );
}
function ATile({ icon, label, value, grad }) {
  return (
    <motion.div variants={riseItem} className="surface" style={{ ...card, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, height: 90, width: 90, borderRadius: "50%", background: grad, opacity: 0.18, filter: "blur(24px)" }} />
      <div style={{ height: 32, width: 32, borderRadius: 9, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 10 }}><Icon name={icon} size={16} /></div>
      <div className="tabular" style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
    </motion.div>
  );
}

// ---------- Projects dashboard (#18) ----------
export function ProjectsScreen({ data, onPickUser }) {
  const { projects, people, machines = [] } = data;
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} variants={staggerGrid}>
        <ATile icon="FolderKanban" label="Active projects" value={projects.filter((p) => p.activeUsers > 0).length} grad="var(--grad-cyan)" />
        <ATile icon="Boxes" label="Total tracked" value={projects.length} grad="var(--grad-navy)" />
        <ATile icon="Users" label="Contributors" value={new Set(people.filter((p) => p.project !== "—").map((p) => p.id)).size} grad="var(--grad-emerald)" />
        <ATile icon="Clock" label="Hours today" value={people.reduce((a, p) => a + (p.project !== "—" ? p.hours : 0), 0).toFixed(0) + "h"} grad="var(--grad-amber)" />
      </motion.div>

      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", marginTop: 16 }} variants={staggerGrid}>
        {projects.length === 0 ? <div className="surface" style={card}><div className="muted" style={{ fontSize: 12, padding: 16, textAlign: "center" }}>No projects yet. They appear when the agent/plugin observes a central model.</div></div> : projects.map((pr) => {
          const team = people.filter((p) => p.project === pr.code);
          const hours = team.reduce((a, p) => a + p.hours, 0);
          // Autodesk IDs used on this project (from machines whose user works it)
          const ids = [...new Set(machines.filter((m) => team.some((t) => t.id === m.person_id)).map((m) => m.autodesk_user).filter((x) => x && x.includes("@")))];
          return (
            <motion.div key={pr.code} variants={riseItem} className="surface surface-hover" style={card}>
              <div className="between" style={{ marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{pr.code}</div>
                <Pill tone={pr.activeUsers > 0 ? "success" : "neutral"} dot>{pr.activeUsers > 0 ? "live" : "idle"}</Pill>
              </div>
              <div className="row gap-3" style={{ marginBottom: 12 }}>
                <MiniStat label="Hours" value={hours.toFixed(1) + "h"} />
                <MiniStat label="Users" value={`${pr.activeUsers}/${pr.totalUsers}`} />
                <MiniStat label="Warnings" value={pr.warnings} />
              </div>
              {/* contributors */}
              <div className="micro" style={{ marginBottom: 6 }}>Working now</div>
              <div className="row gap-2" style={{ flexWrap: "wrap", marginBottom: ids.length ? 12 : 0 }}>
                {team.filter((t) => t.status !== "offline").length === 0 ? <span className="muted" style={{ fontSize: 11.5 }}>No one active</span> :
                  team.filter((t) => t.status !== "offline").map((t) => (
                    <button key={t.id} onClick={() => onPickUser?.(t)} title={t.name} style={{ display: "inline-flex" }}>
                      <Avatar name={t.name} initials={t.initials} discipline={t.discipline} status={t.status} size={28} />
                    </button>
                  ))}
              </div>
              {ids.length > 0 && (
                <>
                  <div className="micro" style={{ marginBottom: 6 }}>Autodesk IDs in use</div>
                  <div className="col gap-2">
                    {ids.map((id) => <span key={id} className="mono" style={{ fontSize: 10.5, color: "rgb(var(--fg-soft))" }}>{id}</span>)}
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
function MiniStat({ label, value }) {
  return <div style={{ flex: 1, padding: "8px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
    <div className="micro" style={{ fontSize: 9 }}>{label}</div>
    <div className="tabular" style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{value}</div>
  </div>;
}
