import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Icon, CardTitle, Avatar, Pill } from "../components/primitives.jsx";
import { staggerGrid, riseItem, spring } from "../motion/variants.js";
import { exportCsv, copyText } from "../lib/util.js";
import { exportAttendanceXlsx, exportProjectsXlsx, exportReportXlsx } from "../lib/excel.js";
import { auth } from "../lib/auth.js";
import { rest, SUPABASE_URL, SUPABASE_ANON, projectLabelForFile, dedupeActivity, modelStatsForFiles } from "../lib/data.js";

const card = { padding: "var(--pad-card)" };
const STATUS_COLORS = { online: "#10b981", meeting: "#a78bfa", idle: "#f59e0b", offline: "#475569" };

function Empty({ children }) {
  return <div className="muted" style={{ fontSize: 12, padding: 20, textAlign: "center" }}>{children}</div>;
}

// ---------- PROJECT MONITORING ----------
export function RevitScreen({ data }) {
  const { projects, people = [], filesSeen = [], rawSessions = [], fileRows = [], projectRows = [], folders = [], unassigned = [] } = data;
  const [sel, setSel] = useState(null);
  const fmtHM2 = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  // Monitoring shows project FOLDERS that have models assigned (or activity).
  const monFolders = folders.filter((f) => f.files.length > 0 || f.users.length > 0)
    .sort((a, b) => (b.activeUsers - a.activeUsers) || (b.totalHours - a.totalHours));
  const unassignedHere = filesSeen.filter((x) => x.projectId == null && !x.ignored);
  const selFolder = folders.find((x) => x.id === sel);

  // Resolve a file to its assigned project label (or the file name if unassigned).
  const labelFor = (file) => projectLabelForFile(file, fileRows, projectRows).label;

  // Currently-active models: sessions still 'active' (live heartbeat).
  const now = Date.now();
  const activeSessions = (rawSessions || []).filter((s) => s.status === "active" && s.last_heartbeat && (now - new Date(s.last_heartbeat)) < 15 * 60 * 1000);
  const activeByFile = {};
  activeSessions.forEach((s) => {
    const f = s.project;
    if (!activeByFile[f]) activeByFile[f] = { file: f, label: labelFor(f), users: [], lastBeat: s.last_heartbeat };
    const who = people.find((pp) => pp.id === s.person_id);
    activeByFile[f].users.push(who ? who.name : s.person_id);
    if (s.last_heartbeat > activeByFile[f].lastBeat) activeByFile[f].lastBeat = s.last_heartbeat;
  });
  const liveModels = Object.values(activeByFile);

  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      {/* Currently Active models banner */}
      {liveModels.length > 0 && (
        <motion.div className="surface" variants={riseItem}
          style={{ ...card, marginBottom: 16, border: "1px solid rgb(var(--success)/0.35)", background: "rgb(var(--success)/0.04)" }}>
          <div className="row gap-2" style={{ marginBottom: 10 }}>
            <span className="dot" style={{ background: "rgb(var(--success))", animation: "ti-pulse 1.6s infinite" }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Active now</span>
            <span className="muted" style={{ fontSize: 11.5 }}>· {liveModels.length} model{liveModels.length > 1 ? "s" : ""} being worked on</span>
          </div>
          <div className="col gap-2">
            {liveModels.map((m) => (
              <div key={m.file} className="between" style={{ padding: "9px 12px", borderRadius: 10, background: "rgb(var(--bg-sunken))" }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <Icon name={m.label !== m.file ? "Folder" : "Box"} size={14} color="rgb(var(--success))" />
                  <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                  <Pill tone="success" dot>Active</Pill>
                </div>
                <span className="muted truncate" style={{ fontSize: 11, flex: "none", maxWidth: 200 }}>{[...new Set(m.users)].join(", ")}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="between" style={{ marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 12.5 }}>{monFolders.length} project folder{monFolders.length === 1 ? "" : "s"} · {unassignedHere.length} unassigned model{unassignedHere.length === 1 ? "" : "s"}</div>
        <button className="btn btn-secondary btn-sm" onClick={() => exportProjectsXlsx(projects, data.people)}><Icon name="FileSpreadsheet" size={12} /> Export Excel</button>
      </div>

      {/* Project FOLDER cards — monitoring is project-based, not file-based */}
      {monFolders.length === 0 ? (
        <div className="surface" style={card}><Empty>No active project folders yet. Assign Revit models to projects in the Projects tab; their activity rolls up here.</Empty></div>
      ) : (
        <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))" }} variants={staggerGrid}>
          {monFolders.map((f) => (
            <motion.button key={f.id} variants={riseItem} onClick={() => setSel(f.id)}
              whileHover={{ y: -4, transition: spring.snappy }} whileTap={{ scale: 0.98 }}
              className="surface surface-hover" style={{ ...card, textAlign: "left" }}>
              <div className="between" style={{ marginBottom: 8 }}>
                <div className="row gap-2"><Icon name="Folder" size={14} color="rgb(var(--accent))" /><span className="mono" style={{ fontSize: 11, color: "rgb(var(--fg-muted))" }}>{f.code}</span></div>
                <Pill tone={f.activeUsers > 0 ? "success" : "neutral"} dot>{f.activeUsers > 0 ? "active" : "idle"}</Pill>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 10, minHeight: 34 }}>{f.name}</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <Metric label="Hours" value={f.totalHours.toFixed(1) + "h"} />
                <Metric label="Working" value={f.activeUsers + "/" + f.users.length} />
                <Metric label="Models" value={f.files.length} />
              </div>
              {f.lastActivity && <div className="muted" style={{ fontSize: 10, marginTop: 8 }}>Last activity {new Date(f.lastActivity).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Unassigned models (plugin-confirmed but not in a folder yet) */}
      {unassignedHere.length > 0 && (
        <div className="surface" style={{ ...card, marginTop: 16 }}>
          <div className="micro" style={{ marginBottom: 8 }}>Unassigned Revit models — assign them in the Projects tab</div>
          <div className="col gap-1">
            {unassignedHere.slice(0, 8).map((u) => (
              <div key={u.file} className="row gap-2" style={{ padding: "6px 9px", borderRadius: 8, background: "rgb(var(--bg-sunken))" }}>
                <Icon name="Box" size={12} color="rgb(var(--warning))" />
                <span className="mono truncate" style={{ fontSize: 10.5 }}>{u.file}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder detail: models + per-model users/time + project stats */}
      <AnimatePresence>
        {selFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSel(null)}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ x: 470 }} animate={{ x: 0 }} exit={{ x: 470 }} transition={spring.soft}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 470, maxWidth: "92vw", height: "100%", background: "rgb(var(--bg-elev))", padding: 24, overflowY: "auto" }}>
              <div className="between" style={{ marginBottom: 6 }}>
                <div className="row gap-2"><Icon name="Folder" size={16} color="rgb(var(--accent))" /><span className="mono muted" style={{ fontSize: 12 }}>{selFolder.code}</span></div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSel(null)}><Icon name="X" size={16} /></button>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, lineHeight: 1.3 }}>{selFolder.name}</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                <Metric label="Total time" value={fmtHM2(selFolder.totalFocusMin)} big />
                <Metric label="Working now" value={selFolder.activeUsers} big />
                <Metric label="Users" value={selFolder.users.length} big />
                <Metric label="Models" value={selFolder.files.length} big />
                <Metric label="Worksets" value={selFolder.worksets} big />
                <Metric label="Warnings" value={selFolder.warnings} tone={selFolder.warnings > 0 ? "warning" : undefined} big />
              </div>

              <div className="micro" style={{ marginBottom: 8 }}>Models · time & users per model</div>
              <div className="col gap-2" style={{ marginBottom: 16 }}>
                {modelStatsForFiles(selFolder.files, rawSessions, people).map((m) => (
                  <div key={m.file} style={{ padding: "9px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
                    <div className="row gap-2">
                      <Icon name="Box" size={13} color={m.activeNow ? "rgb(var(--success))" : "rgb(var(--accent))"} />
                      <span className="mono truncate" style={{ fontSize: 11, flex: 1, fontWeight: 600 }}>{m.file}</span>
                      {m.activeNow && <Pill tone="success" dot>active</Pill>}
                      <span className="tabular" style={{ fontSize: 12, fontWeight: 700, color: "rgb(var(--accent))" }}>{fmtHM2(m.totalMin)}</span>
                    </div>
                    {m.users.length > 0 && (
                      <div style={{ marginTop: 5, paddingLeft: 21 }}>
                        {m.users.map((u) => (
                          <div key={u.id} className="between" style={{ fontSize: 10.5, padding: "2px 0" }}>
                            <span className="muted truncate">{u.name}</span>
                            <span className="tabular" style={{ color: "rgb(var(--accent-2))" }}>{fmtHM2(u.min)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 9.5, paddingLeft: 21, marginTop: 3 }}>{m.lastActive ? "last activity " + new Date(m.lastActive).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "no sessions recorded yet"}</div>
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 11, lineHeight: 1.6 }}>
                Time accumulates from plugin work sessions across all models in this project. Manage model assignment in the Projects tab.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
// Per-user active working time on a given central file (#4 detailed tracking).
function UsersOnFile({ fileCode, people }) {
  const team = (people || []).filter((p) => p.project && (p.project === fileCode || p.project.startsWith(fileCode)));
  const fmtHM = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  const working = team.filter((u) => u.status !== "offline").length;
  const totalMin = team.reduce((a, u) => a + u.focusMin, 0);
  return (
    <div style={{ marginTop: 18 }}>
      <div className="between" style={{ marginBottom: 8 }}>
        <span className="micro">Users on this file</span>
        <span className="muted" style={{ fontSize: 11 }}>{working} working · {fmtHM(totalMin)} total</span>
      </div>
      {team.length === 0 ? (
        <div className="muted" style={{ fontSize: 11.5 }}>No tracked users on this file yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {team.sort((a, b) => b.focusMin - a.focusMin).map((u) => (
            <div key={u.id} className="between" style={{ padding: "7px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <Avatar name={u.name} initials={u.initials} discipline={u.discipline} status={u.status} size={26} />
                <div style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
                  <div className="muted" style={{ fontSize: 10, textTransform: "capitalize" }}>{u.status}</div>
                </div>
              </div>
              <span className="tabular" style={{ fontSize: 12, color: "rgb(var(--accent))", flex: "none" }}>{fmtHM(u.focusMin)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone, big }) {
  return (
    <div style={{ padding: big ? 12 : 8, borderRadius: 10, background: "rgb(var(--bg-sunken))" }}>
      <div className="micro" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="tabular" style={{ fontSize: big ? 22 : 16, fontWeight: 700, marginTop: 2, color: tone === "warning" ? "rgb(var(--warning))" : "rgb(var(--fg))" }}>{value}</div>
    </div>
  );
}

// ---------- LIVE USERS ----------
export function LiveScreen({ data }) {
  const { people, activity, rawSessions = [], fileRows = [], projectRows = [] } = data;
  const online = people.filter((p) => p.status !== "offline");
  const labelFor = (file) => projectLabelForFile(file, fileRows, projectRows).label;
  // Active sessions = current projects being worked on right now.
  const now = Date.now();
  const activeNow = (rawSessions || []).filter((s) => s.status === "active" && s.last_heartbeat && (now - new Date(s.last_heartbeat)) < 15 * 60 * 1000);
  const inRevit = new Set(activeNow.map((s) => s.person_id));
  // Rich status: derive from plugin sessions + agent presence.
  const richStatus = (p) => {
    if (inRevit.has(p.id)) return { label: "Active in Revit", tone: "success" };
    if (p.status === "meeting") return { label: "In Meeting", tone: "info" };
    if (p.status === "idle") return { label: "Idle", tone: "warning" };
    if (p.status === "online") return { label: p.project && p.project !== "—" ? "Working on Project" : "Active on PC", tone: "success" };
    return { label: "Offline", tone: "neutral" };
  };
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))" }} variants={staggerGrid}>
        <Stat icon="Radio" label="Online now" value={online.length} grad="var(--grad-emerald)" />
        <Stat icon="Box" label="Active in Revit" value={activeNow.length} grad="var(--grad-cyan)" />
        <Stat icon="Moon" label="Idle" value={people.filter((p) => p.status === "idle").length} grad="var(--grad-amber)" />
        <Stat icon="Video" label="In meetings" value={people.filter((p) => p.status === "meeting").length} grad="var(--grad-violet)" />
      </motion.div>
      <motion.div className="surface" style={{ ...card, marginTop: 16 }} variants={riseItem}>
        <CardTitle title="Who's working now" subtitle={online.length + " active"} icon="Users"
          right={<button className="btn btn-secondary btn-sm" onClick={() => exportCsv("live-users", online.map((p) => ({ name: p.name, status: p.status, project: labelFor(p.project), hours: p.hours })))}><Icon name="Download" size={12} /> Export</button>} />
        {online.length === 0 ? <Empty>No one is online right now. Presence comes from the desktop agent — if this is empty, the agent isn't reporting status.</Empty> : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))" }}>
            {online.map((p) => (
              <motion.div key={p.id} variants={riseItem} className="row gap-3" style={{ padding: 12, borderRadius: 12, background: "rgb(var(--bg-sunken))", alignItems: "flex-start" }}>
                <Avatar name={p.name} initials={p.initials} discipline={p.discipline} status={p.status} size={38} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, wordBreak: "break-word" }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 11, lineHeight: 1.35, wordBreak: "break-word" }}>{p.project !== "—" ? labelFor(p.project) : p.role}</div>
                  <div style={{ marginTop: 6 }}><Pill tone={richStatus(p).tone} dot>{richStatus(p).label}</Pill></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
function Stat({ icon, label, value, grad }) {
  return (
    <motion.div variants={riseItem} className="surface" style={{ ...card, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, height: 90, width: 90, borderRadius: "50%", background: grad, opacity: 0.16, filter: "blur(24px)" }} />
      <div style={{ height: 32, width: 32, borderRadius: 9, background: grad, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: 10 }}><Icon name={icon} size={16} /></div>
      <div className="tabular" style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
    </motion.div>
  );
}

// ---------- TEAMS ACTIVITY ----------
export function TeamsScreen({ data }) {
  const { people, activity, teamsEvents: dedicated = [] } = data;
  const inCall = people.filter((p) => p.status === "meeting");
  // Use the dedicated teams-events query (last 50, any age) — the general
  // activity feed only holds the latest 200 events of ALL kinds, so Teams
  // events can fall outside it and wrongly display as zero.
  const teamsEvents = dedicated.length ? dedicated : activity.filter((a) => a.kind === "teams");
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="surface" style={card} variants={riseItem}>
        <CardTitle title="In Teams meetings now" subtitle={inCall.length + " people"} icon="Video" />
        {inCall.length === 0 ? <Empty>No one is in a Teams meeting right now.</Empty> : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))" }}>
            {inCall.map((p) => (
              <div key={p.id} className="row gap-3" style={{ padding: 10, borderRadius: 12, background: "rgb(var(--bg-sunken))" }}>
                <Avatar name={p.name} initials={p.initials} discipline={p.discipline} status="meeting" size={36} />
                <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      <motion.div className="surface" style={{ ...card, marginTop: 16 }} variants={riseItem}>
        <CardTitle title="Recent Teams activity" subtitle={teamsEvents.length + " events"} icon="MessageSquare" />
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 12, lineHeight: 1.6 }}>
          The agent detects whether someone is in a Teams call and for how long. Who they're calling, meeting titles, and exact durations require the Microsoft Graph API (admin consent on your M365 tenant) — not visible to a desktop agent.
        </div>
        {teamsEvents.length === 0 ? <Empty>No Teams events captured yet.</Empty> : teamsEvents.slice(0, 14).map((a) => {
          const u = people.find((p) => p.id === a.user);
          return <div key={a.id} className="row gap-3" style={{ padding: "7px 4px", borderBottom: "1px solid rgb(var(--hairline))" }}>
            <Icon name="Video" size={13} color="rgb(var(--accent-2))" />
            <div style={{ flex: 1, fontSize: 12 }}><b>{u ? u.name : "Someone"}</b> <span className="muted">{a.detail}</span></div>
            <span className="muted tabular" style={{ fontSize: 10.5 }}>{a.t}m</span>
          </div>;
        })}
      </motion.div>
    </motion.div>
  );
}

// ---------- EMPLOYEES ----------
export function EmployeesScreen({ data, onPickUser }) {
  const { people, rawSessions = [] } = data;
  // Session-derived Revit time per person (real plugin data, independent of agent).
  const revitMinBy = {};
  (rawSessions || []).forEach((sx) => { revitMinBy[sx.person_id] = (revitMinBy[sx.person_id] || 0) + Math.round((sx.duration_seconds || 0) / 60); });
  const [q, setQ] = useState("");
  const filtered = people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.dept.toLowerCase().includes(q.toLowerCase()));
  const fmtHM = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <div className="row gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => exportCsv("employees", people.map((p) => ({
            name: p.name, email: p.email, dept: p.dept, role: p.role, status: p.status, project: p.project,
            active_h: (p.focusMin / 60).toFixed(2), idle_h: (p.idleMin / 60).toFixed(2),
            hours: p.hours, overtime: p.ot, utilization_pct: p.utilization, machine: p.machine,
          })))}><Icon name="Download" size={12} /> CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => exportAttendanceXlsx(people, { rangeLabel: "Today" })}>
            <Icon name="FileSpreadsheet" size={12} /> Excel
          </button>
        </div>
      </div>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>Name</th><th>Dept</th><th>Status</th><th>Active</th><th>Idle</th><th>Revit</th><th>Productive</th><th>Overtime</th><th>Util</th><th></th></tr></thead>
          <tbody>
            {filtered.map((p) => {
              const totalPc = p.focusMin + p.idleMin;
              return (
                <tr key={p.id}>
                  <td><button className="row gap-2" onClick={() => onPickUser?.(p)} style={{ textAlign: "left" }}><Avatar name={p.name} initials={p.initials} discipline={p.discipline} status={p.status} size={28} /><div><div style={{ fontWeight: 600 }}>{p.name}</div><div className="muted" style={{ fontSize: 10.5 }}>{p.role}</div></div></button></td>
                  <td className="muted">{p.dept}</td>
                  <td><Pill tone={p.status === "online" ? "success" : p.status === "meeting" ? "info" : p.status === "idle" ? "warning" : "neutral"} dot>{p.status}</Pill></td>
                  <td className="tabular" style={{ color: "rgb(var(--success))" }}>{fmtHM(p.focusMin)}</td>
                  <td className="tabular muted">{fmtHM(p.idleMin)}</td>
                  <td className="tabular" style={{ color: "rgb(var(--accent))" }}>{fmtHM(revitMinBy[p.id] || 0)}</td>
                  <td className="tabular">{p.hours.toFixed(1)}h</td>
                  <td className="tabular" style={{ color: p.ot > 0.5 ? "rgb(var(--warning))" : "rgb(var(--fg-muted))" }}>{p.ot.toFixed(1)}h</td>
                  <td><div className="row gap-2"><div style={{ width: 36, height: 5, borderRadius: 3, background: "rgb(var(--bg-sunken))", overflow: "hidden" }}><div style={{ width: p.utilization + "%", height: "100%", background: "var(--grad-cyan)" }} /></div><span className="tabular" style={{ fontSize: 11 }}>{p.utilization}%</span></div></td>
                  <td><button className="btn btn-ghost btn-icon" title="Copy email" onClick={() => copyText(p.email)}><Icon name="Mail" size={13} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ---------- WORK ANALYTICS ----------
export function AnalyticsScreen({ data }) {
  const { people, rawSessions = [], fileRows = [], projectRows = [] } = data;
  const sumF = people.reduce((a, p) => a + p.focusMin, 0);
  const sumI = people.reduce((a, p) => a + p.idleMin, 0);
  const focusPct = sumF + sumI ? Math.round((sumF / (sumF + sumI)) * 100) : 0;

  // Revit hours from plugin sessions (real data even before agent reports).
  const totalRevitH = (rawSessions || []).reduce((a, s) => a + (s.duration_seconds || 0), 0) / 3600;

  // Utilization by discipline: average agent utilization; fall back to session
  // share when agent data is zero so the chart still reflects reality.
  const byDisc = {};
  people.forEach((p) => { const k = p.discipline || "UNASSIGNED"; byDisc[k] = byDisc[k] || { n: 0, util: 0, revitMin: 0 }; byDisc[k].n++; byDisc[k].util += p.utilization; });
  (rawSessions || []).forEach((s) => {
    const who = people.find((p) => p.id === s.person_id);
    const k = who?.discipline || "UNASSIGNED";
    byDisc[k] = byDisc[k] || { n: 1, util: 0, revitMin: 0 };
    byDisc[k].revitMin += Math.round((s.duration_seconds || 0) / 60);
  });
  const discData = Object.entries(byDisc).map(([name, v]) => ({
    name: name[0] + name.slice(1).toLowerCase(),
    value: Math.round(v.util / Math.max(1, v.n)) || Math.min(100, Math.round(v.revitMin / 4.8)),  // session fallback
  })).filter((d) => d.name !== "Unassigned" || d.value > 0);

  // 7-day Revit hours trend from sessions.
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const trend = days.map((d) => ({
    day: new Date(d).toLocaleDateString("en-GB", { weekday: "short" }),
    hours: +(((rawSessions || []).filter((s) => (s.started_at || "").startsWith(d)).reduce((a, s) => a + (s.duration_seconds || 0), 0)) / 3600).toFixed(1),
  }));

  // Project hours (top folders by session time, via assignments).
  const projMin = {};
  (rawSessions || []).forEach((s) => {
    const lbl = projectLabelForFile(s.project, fileRows, projectRows);
    const key = lbl.projectId ? lbl.label : null;
    if (!key) return;
    projMin[key] = (projMin[key] || 0) + Math.round((s.duration_seconds || 0) / 60);
  });
  const projData = Object.entries(projMin).map(([name, min]) => ({ name: name.length > 28 ? name.slice(0, 28) + "…" : name, hours: +(min / 60).toFixed(1) }))
    .sort((a, b) => b.hours - a.hours).slice(0, 8);

  const tooltipStyle = { background: "rgb(var(--bg-elev))", border: "1px solid rgb(var(--hairline))", borderRadius: 10, fontSize: 12, color: "rgb(var(--fg))" };
  const tick = { fill: "rgb(var(--fg-muted))", fontSize: 11 };

  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} variants={staggerGrid}>
        <Stat icon="TrendingUp" label="Focus share" value={focusPct + "%"} grad="var(--grad-emerald)" />
        <Stat icon="Users" label="Active staff" value={people.filter((p) => p.status !== "offline").length} grad="var(--grad-cyan)" />
        <Stat icon="Box" label="Revit hours (all)" value={totalRevitH.toFixed(1) + "h"} grad="var(--grad-violet)" />
        <Stat icon="Clock" label="Agent hours" value={people.reduce((a, p) => a + p.hours, 0).toFixed(0) + "h"} grad="var(--grad-amber)" />
      </motion.div>

      <motion.div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16, gap: 16 }} variants={staggerGrid}>
        <motion.div className="surface" style={card} variants={riseItem}>
          <CardTitle title="Utilization by discipline" subtitle="Agent utilization · session fallback" icon="BarChart3" />
          {discData.length === 0 ? <Empty>No discipline data yet — set Role/Department in Settings.</Empty> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={discData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={96} tick={tick} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(var(--fg)/0.05)" }} formatter={(v) => [v + "%", "Utilization"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#1890cc" animationDuration={900} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div className="surface" style={card} variants={riseItem}>
          <CardTitle title="Revit hours · last 7 days" subtitle="From plugin work sessions" icon="TrendingUp" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trend} margin={{ left: -18, right: 8 }}>
              <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(var(--fg)/0.05)" }} formatter={(v) => [v + "h", "Hours"]} />
              <Bar dataKey="hours" radius={[5, 5, 0, 0]} fill="#00b88a" animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      <motion.div className="surface" style={{ ...card, marginTop: 16 }} variants={riseItem}>
        <CardTitle title="Hours by project" subtitle="Accumulated session time per project folder" icon="FolderKanban" />
        {projData.length === 0 ? <Empty>No project hours yet — assign Revit models to project folders and time accrues here.</Empty> : (
          <ResponsiveContainer width="100%" height={Math.max(160, projData.length * 38)}>
            <BarChart data={projData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={190} tick={tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(var(--fg)/0.05)" }} formatter={(v) => [v + "h", "Hours"]} />
              <Bar dataKey="hours" radius={[0, 6, 6, 0]} fill="#1890cc" animationDuration={900} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------- REPORTS ----------
export function ReportsScreen({ data }) {
  const { people, projects, folders = [], rawSessions = [] } = data;
  const [days, setDays] = useState(7);
  const [dept, setDept] = useState("all");
  const [proj, setProj] = useState("all");
  const [reportType, setReportType] = useState("attendance");
  const depts = ["all", ...new Set(people.map((p) => p.dept))];
  const projCodes = ["all", ...projects.map((p) => p.code)];

  function filteredPeople() {
    return people.filter((p) => (dept === "all" || p.dept === dept) && (proj === "all" || p.project === proj));
  }
  function rangeLabel() { return days === 1 ? "Last 24 hours" : `Last ${days} days`; }

  function generateExcel() {
    if (reportType === "attendance") {
      exportAttendanceXlsx(filteredPeople(), { rangeLabel: rangeLabel() });
    } else if (reportType === "projects") {
      // PROJECT-FOLDER based report: one row per project folder with totals.
      const rows = folders.filter((fo) => fo.files.length > 0 || fo.users.length > 0).map((fo) => ({
        "Project": fo.label,
        "Total Hours": +(fo.totalFocusMin / 60).toFixed(2),
        "Users": fo.users.length,
        "Working Now": fo.activeUsers,
        "Models": fo.files.length,
        "Warnings": fo.warnings,
        "Last Activity": fo.lastActivity ? new Date(fo.lastActivity).toLocaleString("en-GB") : "—",
        "Utilization %": fo.users.length ? Math.round(fo.users.reduce((a, u) => a + (u.focusMin > 0 ? 100 : 0), 0) / fo.users.length) : 0,
      }));
      exportReportXlsx("project-summary", "Project Summary — by Project Folder",
        rows.length ? rows : [{ Note: "No project folder activity yet" }],
        rows.length ? ["Project", "Total Hours", "Users", "Working Now", "Models", "Warnings", "Last Activity", "Utilization %"] : ["Note"]);
    } else {
      exportReportXlsx("tangent-utilization", "Utilization Report",
        filteredPeople().map((p) => ({ Employee: p.name, Department: p.dept, Role: p.role,
          "Active (h)": +(p.focusMin / 60).toFixed(2), "Idle (h)": +(p.idleMin / 60).toFixed(2),
          "Hours": p.hours, "Overtime": p.ot, "Utilization %": p.utilization })),
        ["Employee", "Department", "Role", "Active (h)", "Idle (h)", "Hours", "Overtime", "Utilization %"]);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="surface" style={card}>
        <CardTitle title="Report builder" subtitle="Filter, then export to the Tangent Excel template" icon="FileBarChart" />
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
          <Field label="Report"><select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="attendance">Attendance & Activity</option>
            <option value="projects">Project Productivity</option>
            <option value="utilization">Utilization</option>
          </select></Field>
          <Field label="Department"><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
            {depts.map((d) => <option key={d} value={d}>{d === "all" ? "All departments" : d}</option>)}
          </select></Field>
          <Field label="Project"><select className="input" value={proj} onChange={(e) => setProj(e.target.value)}>
            {projCodes.map((p) => <option key={p} value={p}>{p === "all" ? "All projects" : p}</option>)}
          </select></Field>
          <Field label="Date range"><select className="input" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={1}>Last 24h</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select></Field>
        </div>
        <div className="between">
          <span className="muted" style={{ fontSize: 11.5 }}>
            {filteredPeople().length} staff · {filteredPeople().reduce((a, p) => a + p.hours, 0).toFixed(1)}h today
          </span>
          <div className="row gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => exportCsv("tangent-report", filteredPeople().map((p) => ({
              name: p.name, dept: p.dept, role: p.role, status: p.status, active_h: (p.focusMin / 60).toFixed(2),
              idle_h: (p.idleMin / 60).toFixed(2), hours: p.hours, overtime: p.ot, utilization: p.utilization })))}>
              <Icon name="Download" size={12} /> CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={generateExcel}>
              <Icon name="FileSpreadsheet" size={13} /> Generate Excel
            </button>
          </div>
        </div>
      </div>

      <div className="surface" style={{ ...card, marginTop: 14 }}>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
          <b>Note on the Excel template:</b> reports export as real .xlsx workbooks with branded headers,
          summary totals, and per-sheet breakdowns (Projects + By-User). To match your exact in-house
          Tangent template, share the .xlsx file and the styling/columns will be aligned to it.
        </div>
      </div>
    </motion.div>
  );
}
function Field({ label, children }) { return <div><div className="micro" style={{ marginBottom: 4 }}>{label}</div>{children}</div>; }

// ---------- HISTORY ----------
export function HistoryScreen({ data }) {
  const { activity, people, fileRows = [], projectRows = [] } = data;
  const [kind, setKind] = useState("all");
  const deduped = dedupeActivity(activity, fileRows, projectRows);
  const kinds = [...new Set(deduped.map((a) => a.kind))];
  const rows = deduped.filter((a) => kind === "all" || a.kind === kind);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <div className="seg">
          <button className={kind === "all" ? "on" : ""} onClick={() => setKind("all")}>All</button>
          {kinds.map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>)}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => exportCsv("activity-history", rows.map((a) => ({ occurred_at: a.at, kind: a.kind, who: people.find((p) => p.id === a.user)?.name || "", project: a.projectLabel, detail: a.detail })))}><Icon name="Download" size={12} /> Export</button>
      </div>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>When</th><th>Kind</th><th>Who</th><th>Project</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.slice(0, 200).map((a) => {
              const u = people.find((p) => p.id === a.user);
              return <tr key={a.id}><td className="muted tabular" style={{ fontSize: 11 }}>{a.at ? new Date(a.at).toLocaleString("en-GB") : "—"}</td><td><Pill tone="neutral">{a.kind}</Pill></td><td>{u ? u.name : "—"}</td><td style={{ fontSize: 11.5, fontWeight: a.projectId ? 600 : 400 }}>{a.projectLabel}</td><td style={{ fontSize: 12 }}>{a.detail}</td></tr>;
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No events in this view.</Empty>}
      </div>
    </motion.div>
  );
}

// ---------- AUTODESK ID MANAGER ----------
export function AdminScreen({ data, me }) {
  const { people, machines = [] } = data;
  const isAdmin = !!me?.isAdmin;
  // Build ID -> users/machines map from machines table
  const byId = {};
  machines.forEach((m) => {
    const id = (m.autodesk_user || "").trim();
    if (!id) return;   // accept any non-empty Autodesk ID (email OR username)
    byId[id] = byId[id] || { id, users: new Set(), machines: [], online: 0, lastSeen: null };
    if (m.person_id) byId[id].users.add(m.person_id);
    byId[id].machines.push(m);
    if (m.online) byId[id].online++;
    if (!byId[id].lastSeen || m.last_seen > byId[id].lastSeen) byId[id].lastSeen = m.last_seen;
  });
  const rows = Object.values(byId).sort((a, b) => (b.online - a.online) || ((b.lastSeen || "") > (a.lastSeen || "") ? 1 : -1));
  const [open, setOpen] = useState({});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <CardTitle title="Autodesk ID Manager" subtitle={rows.length + " IDs observed" + (isAdmin ? "" : " · read-only")} icon="KeyRound"
          right={<div style={{ padding: 14 }} />} />
        {rows.length === 0 ? <Empty>No Autodesk logins captured yet. Agents report these once a machine is signed into Autodesk.</Empty> : (
          <div>
            {rows.map((r) => {
              const users = [...r.users].map((id) => people.find((p) => p.id === id)).filter(Boolean);
              const isOpen = open[r.id];
              return (
                <div key={r.id} style={{ borderBottom: "1px solid rgb(var(--hairline))" }}>
                  <div className="row gap-3 click" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))} style={{ padding: "11px 16px" }}>
                    <Icon name={isOpen ? "ChevronDown" : "ChevronRight"} size={14} color="rgb(var(--fg-muted))" />
                    <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{r.id}</div>
                    <span className="muted" style={{ fontSize: 12 }}>{users.map((u) => u.name).join(", ") || "unresolved"}</span>
                    {r.users.size > 1 ? <Pill tone="warning">Shared · {r.users.size}</Pill> : <Pill tone="success">{r.online} online</Pill>}
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", background: "rgb(var(--bg-sunken) / 0.5)" }}>
                        <div style={{ padding: "12px 16px 16px 44px" }}>
                          <div className="micro" style={{ marginBottom: 8 }}>Used by</div>
                          <div className="row gap-3" style={{ flexWrap: "wrap", marginBottom: isAdmin ? 14 : 0 }}>
                            {users.length === 0 ? <span className="muted" style={{ fontSize: 12 }}>No staff resolved.</span> : users.map((u) => (
                              <div key={u.id} className="row gap-2" style={{ padding: "6px 10px", borderRadius: 10, background: "rgb(var(--bg))" }}>
                                <Avatar name={u.name} initials={u.initials} discipline={u.discipline} status={u.status} size={26} />
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</span>
                              </div>
                            ))}
                          </div>
                          {isAdmin && (
                            <>
                              <div className="micro" style={{ marginBottom: 8 }}>Machines · {r.machines.length}</div>
                              <table><thead><tr><th>Machine</th><th>Status</th><th>Last seen</th></tr></thead>
                                <tbody>{r.machines.map((m) => <tr key={m.machine_id}><td className="mono" style={{ fontSize: 11 }}>{m.machine_id}</td><td>{m.online ? <Pill tone="success" dot>online</Pill> : <Pill tone="neutral">offline</Pill>}</td><td className="muted tabular" style={{ fontSize: 11 }}>{m.last_seen ? new Date(m.last_seen).toLocaleString("en-GB") : "—"}</td></tr>)}</tbody>
                              </table>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!isAdmin && <div className="surface" style={{ ...card, marginTop: 14, border: "1px solid rgb(var(--accent)/0.25)", background: "rgb(var(--accent)/0.05)" }}>
        <div className="row gap-2" style={{ fontSize: 12.5 }}><Icon name="Info" size={14} color="rgb(var(--accent))" /> Read-only view. Machine details are available to administrators.</div>
      </div>}
    </motion.div>
  );
}

// ---------- SETTINGS ----------
export function SettingsScreen({ data, me, refresh }) {
  const ROLES = ["BIM Manager", "Assistant BIM Manager", "BIM Coordinator", "BIM Modeler", "Senior Modeler", "Modeler", "Detailer", "Project Manager", "Landscape Architect", "Architect", "Automation Specialist", "Staff"];
  const DEPTS = ["BIM", "Design", "AutoCAD", "Irrigation", "MEP", "Landscape", "Architecture", "Detailing", "Engineering", "PM", "IT", "Admin", "Unassigned"];
  const DISCS = ["MANAGER", "COORDINATOR", "MODELER", "DETAILER", "DESIGNER", "UNASSIGNED"];
  const email = auth.getSession()?.user?.email || "";
  const nameFromEmail = (e) => e ? e.split("@")[0].split(/[._-]+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") : "—";
  const [role, setRole] = useState(me?.role || "");
  const [dept, setDept] = useState(me?.dept || "");
  const [disc, setDisc] = useState(me?.discipline || "UNASSIGNED");
  const [status, setStatus] = useState(null);
  const dirty = !me || (role !== me.role || dept !== me.dept || disc !== me.discipline);

  async function save() {
    setStatus({ t: "load", m: "Saving…" });
    try {
      const token = await auth.getValidToken();
      if (!token) { setStatus({ t: "err", m: "Session expired — sign in again." }); return; }
      const headers = { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: "Bearer " + token };

      // Robust save without ON CONFLICT (works even if email has no unique
      // constraint): look up an existing row by email, then PATCH it; if none
      // exists, do a plain INSERT.
      const realId = me && me.id && me.id !== email ? me.id : null;
      let targetId = realId;
      if (!targetId) {
        const q = await fetch(SUPABASE_URL + "/rest/v1/people?select=id&email=ilike." + encodeURIComponent(email), { headers });
        const found = q.ok ? await q.json().catch(() => []) : [];
        if (Array.isArray(found) && found.length > 0) targetId = found[0].id;
      }

      let r;
      if (targetId) {
        r = await fetch(SUPABASE_URL + "/rest/v1/people?id=eq." + encodeURIComponent(targetId), {
          method: "PATCH", headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ role, dept, discipline: disc }),
        });
      } else {
        r = await fetch(SUPABASE_URL + "/rest/v1/people", {
          method: "POST", headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ name: me?.name || nameFromEmail(email), email, role, dept, discipline: disc }),
        });
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({})); const msg = j.message || ("HTTP " + r.status);
        if (r.status === 401 || r.status === 403 || /permission|policy/i.test(msg)) throw new Error("Permission denied — run migration 0005_self_edit_policy.sql in Supabase. (" + msg + ")");
        throw new Error(msg);
      }
      setStatus({ t: "ok", m: "Saved." });
      refresh?.();
    } catch (e) { setStatus({ t: "err", m: e.message }); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="surface" style={{ ...card, maxWidth: 720 }}>
        <CardTitle title="Profile" subtitle="Update your role, department, and discipline" icon="User" />
        <div className="row gap-4" style={{ alignItems: "flex-start" }}>
          <Avatar name={me?.name || nameFromEmail(auth.getSession()?.user?.email)} initials={me?.initials} discipline={disc} size={72} />
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
            <Field label="Full name"><input className="input" value={me?.name || nameFromEmail(auth.getSession()?.user?.email)} readOnly /></Field>
            <Field label="Email"><input className="input" value={auth.getSession()?.user?.email || "—"} readOnly /></Field>
            <Field label="Role"><select className="input" value={role} onChange={(e) => setRole(e.target.value)}>{!role && <option value="">— select —</option>}{(ROLES.includes(role) || !role ? ROLES : [role, ...ROLES]).map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Department"><select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>{!dept && <option value="">— select —</option>}{(DEPTS.includes(dept) || !dept ? DEPTS : [dept, ...DEPTS]).map((o) => <option key={o}>{o}</option>)}</select></Field>
            <Field label="Discipline"><select className="input" value={disc} onChange={(e) => setDisc(e.target.value)}>{DISCS.map((o) => <option key={o}>{o}</option>)}</select></Field>
          </div>
        </div>
        {status && <div style={{ marginTop: 14, fontSize: 12, padding: "8px 12px", borderRadius: 8,
          background: status.t === "err" ? "rgb(var(--danger)/0.1)" : status.t === "ok" ? "rgb(var(--success)/0.1)" : "rgb(var(--bg-sunken))",
          color: status.t === "err" ? "rgb(var(--danger))" : status.t === "ok" ? "rgb(var(--success))" : "rgb(var(--fg-soft))" }}>{status.m}</div>}
        <div className="between" style={{ marginTop: 18 }}>
          <span className="muted" style={{ fontSize: 11 }}>Changes are saved to your own record only.</span>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || status?.t === "load"}><Icon name="Save" size={13} /> Save changes</button>
        </div>
      </div>
    </motion.div>
  );
}
