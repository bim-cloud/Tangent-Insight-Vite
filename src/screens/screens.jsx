import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Icon, CardTitle, Avatar, Pill } from "../components/primitives.jsx";
import { staggerGrid, riseItem, spring } from "../motion/variants.js";
import { exportCsv, copyText } from "../lib/util.js";
import { exportAttendanceXlsx, exportProjectsXlsx, exportReportXlsx } from "../lib/excel.js";
import { auth } from "../lib/auth.js";
import { rest, SUPABASE_URL, SUPABASE_ANON } from "../lib/data.js";

const card = { padding: "var(--pad-card)" };
const STATUS_COLORS = { online: "#10b981", meeting: "#a78bfa", idle: "#f59e0b", offline: "#475569" };

function Empty({ children }) {
  return <div className="muted" style={{ fontSize: 12, padding: 20, textAlign: "center" }}>{children}</div>;
}

// ---------- PROJECT MONITORING ----------
export function RevitScreen({ data }) {
  const { projects } = data;
  const [sel, setSel] = useState(null);
  const p = projects.find((x) => x.code === sel);

  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <div className="between" style={{ marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 12.5 }}>{projects.length} central models tracked from the Revit plugin</div>
        <button className="btn btn-secondary btn-sm" onClick={() => exportProjectsXlsx(projects, data.people)}><Icon name="FileSpreadsheet" size={12} /> Export Excel</button>
      </div>
      {projects.length === 0 ? (
        <div className="surface" style={card}><Empty>No projects yet. They appear once an agent or the Revit plugin observes a central model open.</Empty></div>
      ) : (
        <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }} variants={staggerGrid}>
          {projects.map((pr) => (
            <motion.button key={pr.code} variants={riseItem} onClick={() => setSel(pr.code)}
              whileHover={{ y: -4, transition: spring.snappy }} whileTap={{ scale: 0.98 }}
              className="surface surface-hover" style={{ ...card, textAlign: "left" }}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{pr.code}</div>
                <Pill tone={pr.activeUsers > 0 ? "success" : "neutral"} dot>{pr.activeUsers > 0 ? "active" : "idle"}</Pill>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Metric label="Worksets" value={pr.worksets} />
                <Metric label="Open views" value={pr.openViews} />
                <Metric label="Warnings" value={pr.warnings} tone={pr.warnings > 0 ? "warning" : undefined} />
                <Metric label="Linked" value={pr.linkedModels} />
                <Metric label="Size" value={pr.modelSize ? pr.modelSize + " MB" : "—"} />
                <Metric label="Users" value={pr.activeUsers + "/" + pr.totalUsers} />
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
      <AnimatePresence>
        {p && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSel(null)}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={spring.soft}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 420, maxWidth: "90vw", height: "100%", background: "rgb(var(--bg-elev))", padding: 24, overflowY: "auto" }}>
              <div className="between" style={{ marginBottom: 18 }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{p.code}</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSel(null)}><Icon name="X" size={16} /></button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Metric label="Worksets" value={p.worksets} big />
                <Metric label="Open views" value={p.openViews} big />
                <Metric label="Warnings" value={p.warnings} tone={p.warnings > 0 ? "warning" : undefined} big />
                <Metric label="Linked models" value={p.linkedModels} big />
                <Metric label="Model size" value={p.modelSize ? p.modelSize + " MB" : "—"} big />
                <Metric label="Revit" value={p.version} big />
              </div>
              {p.lastUser && <div className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>Last reported by {p.lastUser}{p.updatedAt ? " · " + new Date(p.updatedAt).toLocaleString("en-GB") : ""}</div>}
              <div className="muted" style={{ fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
                Metrics come from the Tangent Insight Revit plugin (worksets, open views, warnings, linked models, file size). Hard clashes aren't shown — that data lives in Navisworks, not the Revit API.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  const { people, activity } = data;
  const online = people.filter((p) => p.status !== "offline");
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))" }} variants={staggerGrid}>
        <Stat icon="Radio" label="Online now" value={online.length} grad="var(--grad-emerald)" />
        <Stat icon="Video" label="In meetings" value={people.filter((p) => p.status === "meeting").length} grad="var(--grad-violet)" />
        <Stat icon="Moon" label="Idle" value={people.filter((p) => p.status === "idle").length} grad="var(--grad-amber)" />
        <Stat icon="Zap" label="Events/hr" value={activity.filter((a) => a.t <= 60).length} grad="var(--grad-cyan)" />
      </motion.div>
      <motion.div className="surface" style={{ ...card, marginTop: 16 }} variants={riseItem}>
        <CardTitle title="Who's working now" subtitle={online.length + " active"} icon="Users"
          right={<button className="btn btn-secondary btn-sm" onClick={() => exportCsv("live-users", online.map((p) => ({ name: p.name, status: p.status, project: p.project, hours: p.hours })))}><Icon name="Download" size={12} /> Export</button>} />
        {online.length === 0 ? <Empty>No one is online right now.</Empty> : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))" }}>
            {online.map((p) => (
              <motion.div key={p.id} variants={riseItem} className="row gap-3" style={{ padding: 10, borderRadius: 12, background: "rgb(var(--bg-sunken))" }}>
                <Avatar name={p.name} initials={p.initials} discipline={p.discipline} status={p.status} size={38} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div className="truncate muted" style={{ fontSize: 11 }}>{p.project !== "—" ? p.project : p.role}</div>
                </div>
                <Pill tone={p.status === "meeting" ? "info" : p.status === "idle" ? "warning" : "success"} dot>{p.status}</Pill>
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
  const { people, activity } = data;
  const inCall = people.filter((p) => p.status === "meeting");
  const teamsEvents = activity.filter((a) => a.kind === "teams");
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
  const { people } = data;
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
          <thead><tr><th>Name</th><th>Dept</th><th>Status</th><th>Active</th><th>Idle</th><th>Total PC</th><th>Productive</th><th>Overtime</th><th>Util</th><th></th></tr></thead>
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
                  <td className="tabular">{fmtHM(totalPc)}</td>
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
  const { people } = data;
  const sumF = people.reduce((a, p) => a + p.focusMin, 0);
  const sumI = people.reduce((a, p) => a + p.idleMin, 0);
  const focusPct = sumF + sumI ? Math.round((sumF / (sumF + sumI)) * 100) : 0;
  const byDisc = {};
  people.forEach((p) => { const k = p.discipline; byDisc[k] = byDisc[k] || { n: 0, util: 0 }; byDisc[k].n++; byDisc[k].util += p.utilization; });
  const discData = Object.entries(byDisc).map(([name, v]) => ({ name: name[0] + name.slice(1).toLowerCase(), value: Math.round(v.util / v.n) }));
  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} variants={staggerGrid}>
        <Stat icon="TrendingUp" label="Focus share" value={focusPct + "%"} grad="var(--grad-emerald)" />
        <Stat icon="Users" label="Active staff" value={people.filter((p) => p.status !== "offline").length} grad="var(--grad-cyan)" />
        <Stat icon="Clock" label="Total hours" value={people.reduce((a, p) => a + p.hours, 0).toFixed(0) + "h"} grad="var(--grad-violet)" />
        <Stat icon="Timer" label="Overtime" value={people.reduce((a, p) => a + p.ot, 0).toFixed(1) + "h"} grad="var(--grad-amber)" />
      </motion.div>
      <motion.div className="surface" style={{ ...card, marginTop: 16 }} variants={riseItem}>
        <CardTitle title="Utilization by discipline" subtitle="Live average" icon="BarChart3" />
        {discData.length === 0 ? <Empty>No data yet.</Empty> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={discData} layout="vertical">
              <XAxis type="number" hide /><Tooltip contentStyle={{ background: "rgb(17 21 32)", border: "1px solid rgb(38 44 60)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#a78bfa" animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------- REPORTS ----------
export function ReportsScreen({ data }) {
  const { people, projects } = data;
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
      const ps = proj === "all" ? projects : projects.filter((p) => p.code === proj);
      exportProjectsXlsx(ps, filteredPeople());
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
  const { activity, people } = data;
  const [kind, setKind] = useState("all");
  const kinds = [...new Set(activity.map((a) => a.kind))];
  const rows = activity.filter((a) => kind === "all" || a.kind === kind);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="between" style={{ marginBottom: 14 }}>
        <div className="seg">
          <button className={kind === "all" ? "on" : ""} onClick={() => setKind("all")}>All</button>
          {kinds.map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k}</button>)}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => exportCsv("activity-history", rows.map((a) => ({ occurred_at: a.at, kind: a.kind, who: people.find((p) => p.id === a.user)?.name || "", project: a.project, detail: a.detail })))}><Icon name="Download" size={12} /> Export</button>
      </div>
      <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead><tr><th>When</th><th>Kind</th><th>Who</th><th>Project</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.slice(0, 200).map((a) => {
              const u = people.find((p) => p.id === a.user);
              return <tr key={a.id}><td className="muted tabular" style={{ fontSize: 11 }}>{a.at ? new Date(a.at).toLocaleString("en-GB") : "—"}</td><td><Pill tone="neutral">{a.kind}</Pill></td><td>{u ? u.name : "—"}</td><td className="mono" style={{ fontSize: 11.5 }}>{a.project}</td><td style={{ fontSize: 12 }}>{a.detail}</td></tr>;
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
    if (!id || !id.includes("@")) return;
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
  const DEPTS = ["BIM", "Landscape", "Architecture", "Detailing", "Engineering", "PM", "IT", "Admin", "Unassigned"];
  const DISCS = ["MANAGER", "COORDINATOR", "MODELER", "DETAILER", "UNASSIGNED"];
  const [role, setRole] = useState(me?.role || "");
  const [dept, setDept] = useState(me?.dept || "");
  const [disc, setDisc] = useState(me?.discipline || "UNASSIGNED");
  const [status, setStatus] = useState(null);
  const dirty = me && (role !== me.role || dept !== me.dept || disc !== me.discipline);
  const nameFromEmail = (e) => e ? e.split("@")[0].split(/[._-]+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") : "—";

  async function save() {
    if (!me) { setStatus({ t: "err", m: "Your sign-in email doesn't match a staff row. Ask an admin to align public.people." }); return; }
    setStatus({ t: "load", m: "Saving…" });
    try {
      const token = await auth.getValidToken();
      if (!token) { setStatus({ t: "err", m: "Session expired — sign in again." }); return; }
      const r = await fetch(SUPABASE_URL + "/rest/v1/people?id=eq." + encodeURIComponent(me.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: "Bearer " + token, Prefer: "return=minimal" },
        body: JSON.stringify({ role, dept, discipline: disc }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); const msg = j.message || ("HTTP " + r.status);
        if (r.status === 401 || r.status === 403 || /permission|policy/i.test(msg)) throw new Error("Permission denied — run migration 0005_self_edit_policy.sql in Supabase. (" + msg + ")");
        throw new Error(msg); }
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
