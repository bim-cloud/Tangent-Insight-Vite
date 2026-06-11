import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { Icon, CardTitle, Avatar, Pill } from "../components/primitives.jsx";
import { spring, staggerGrid, riseItem } from "../motion/variants.js";
import { exportAttendanceXlsx, exportReportXlsx } from "../lib/excel.js";
import { exportCsv } from "../lib/util.js";
import { auth } from "../lib/auth.js";
import { SUPABASE_URL, SUPABASE_ANON } from "../lib/data.js";

const card = { padding: "var(--pad-card)" };
const fmtHM = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
const timeAgo = (iso) => {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};

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
export function ProjectsScreen({ data, onPickUser, refresh }) {
  const { folders = [], filesSeen = [], projectRows = [], rawSessions = [], people = [] } = data;
  const allSessions = rawSessions;
  const peopleById = {};
  people.forEach((p) => { peopleById[p.id] = p; });
  const [openFolder, setOpenFolder] = useState(null);
  const [assigning, setAssigning] = useState(null);   // { file } being assigned
  const [manageOpen, setManageOpen] = useState(false);
  const [q, setQ] = useState("");
  const fmtHM = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const unassigned = filesSeen.filter((f) => f.projectId == null);
  const active = folders.filter((f) => f.activeUsers > 0).length;
  const totalHours = folders.reduce((a, f) => a + f.totalHours, 0);
  const contributors = new Set();
  folders.forEach((f) => f.users.forEach((u) => contributors.add(u.id)));

  const folder = folders.find((f) => f.id === openFolder);
  const visibleFolders = folders
    .filter((f) => !q || f.label.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.activeUsers - a.activeUsers) || (b.totalHours - a.totalHours) || a.code.localeCompare(b.code));

  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }} variants={staggerGrid}>
        <ATile icon="FolderKanban" label="Total projects" value={folders.length} grad="var(--grad-cyan)" />
        <ATile icon="Activity" label="Active now" value={active} grad="var(--grad-emerald)" />
        <ATile icon="Users" label="Contributors" value={contributors.size} grad="var(--grad-navy)" />
        <ATile icon="Clock" label="Hours today" value={totalHours.toFixed(0) + "h"} grad="var(--grad-amber)" />
      </motion.div>

      {/* Toolbar */}
      <div className="between" style={{ margin: "18px 0 12px" }}>
        <input className="input" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <div className="row gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setManageOpen(true)}>
            <Icon name="FolderTree" size={13} /> Manage file assignments
            {unassigned.length > 0 && <span className="pill pill-warning" style={{ marginLeft: 4 }}>{unassigned.length}</span>}
          </button>
        </div>
      </div>

      {/* Unassigned banner */}
      {unassigned.length > 0 && (
        <motion.div className="surface" style={{ ...card, marginBottom: 14, border: "1px solid rgb(var(--warning)/0.3)" }} variants={riseItem}>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <Icon name="FileWarning" size={15} color="rgb(var(--warning))" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{unassigned.length} Revit file(s) need a project</span>
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 10 }}>These central files have been seen but aren't assigned to any project folder yet. Assign them so their activity rolls up.</div>
          <div className="col gap-2">
            {unassigned.slice(0, 6).map((f) => (
              <div key={f.file} className="between" style={{ padding: "8px 12px", borderRadius: 10, background: "rgb(var(--bg-sunken))" }}>
                <div className="row gap-2" style={{ minWidth: 0 }}>
                  <Icon name="Box" size={14} color="rgb(var(--warning))" />
                  <span className="mono truncate" style={{ fontSize: 11.5 }}>{f.file}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setAssigning({ file: f.file })} style={{ flex: "none" }}>
                  <Icon name="FolderInput" size={12} /> Assign
                </button>
              </div>
            ))}
            {unassigned.length > 6 && <button className="btn btn-ghost btn-sm" onClick={() => setManageOpen(true)}>View all {unassigned.length} →</button>}
          </div>
        </motion.div>
      )}

      {folders.length === 0 ? (
        <div className="surface" style={card}>
          <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, padding: 8 }}>
            No project folders yet. Run the <b>0010_projects.sql</b> migration in Supabase to seed the Tangent project list, then assign Revit files to them.
          </div>
        </div>
      ) : (
        <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }} variants={staggerGrid}>
          {visibleFolders.map((f) => (
            <motion.button key={f.id} variants={riseItem} onClick={() => setOpenFolder(f.id)}
              whileHover={{ y: -3, transition: spring.snappy }} whileTap={{ scale: 0.98 }}
              className="surface surface-hover" style={{ ...card, textAlign: "left" }}>
              <div className="row gap-2" style={{ marginBottom: 10 }}>
                <Icon name="Folder" size={16} color="rgb(var(--accent))" />
                <span className="mono" style={{ fontSize: 11, color: "rgb(var(--fg-muted))" }}>{f.code}</span>
                {f.activeUsers > 0 && <span style={{ marginLeft: "auto" }}><Pill tone="success" dot>{f.activeUsers} live</Pill></span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 12, minHeight: 34 }}>{f.name}</div>
              <div className="row gap-3">
                <MiniStat label="Hours" value={f.totalHours.toFixed(1) + "h"} />
                <MiniStat label="Users" value={f.users.length} />
                <MiniStat label="Models" value={f.files.length} />
              </div>
              {f.lastActivity && (
                <div className="row gap-2" style={{ marginTop: 10, fontSize: 10.5, color: "rgb(var(--fg-muted))" }}>
                  <Icon name="Clock" size={11} />
                  <span>Latest activity {timeAgo(f.lastActivity)}</span>
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Folder detail drawer */}
      <AnimatePresence>
        {folder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpenFolder(null)}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }} transition={spring.soft}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 500, maxWidth: "94vw", height: "100%", background: "rgb(var(--bg-elev))", overflowY: "auto", padding: 24 }}>
              <div className="between" style={{ marginBottom: 6 }}>
                <div className="row gap-2"><Icon name="Folder" size={18} color="rgb(var(--accent))" /><span className="mono muted" style={{ fontSize: 12 }}>{folder.code}</span></div>
                <button className="btn btn-ghost btn-icon" onClick={() => setOpenFolder(null)}><Icon name="X" size={16} /></button>
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{folder.name}</div>
              {folder.lastActivity && <div className="row gap-2 muted" style={{ fontSize: 11.5, marginBottom: 16 }}><Icon name="Clock" size={12} /> Latest activity {timeAgo(folder.lastActivity)}</div>}
              {!folder.lastActivity && <div style={{ marginBottom: 16 }} />}

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                <DTile label="Total time" value={fmtHM(folder.totalFocusMin)} tone="accent" />
                <DTile label="Working now" value={folder.activeUsers} tone="success" />
                <DTile label="Contributors" value={folder.users.length} />
                <DTile label="Models" value={folder.files.length} />
                <DTile label="Worksets" value={folder.worksets} />
                <DTile label="Warnings" value={folder.warnings} tone={folder.warnings > 0 ? "warning" : undefined} />
              </div>

              {/* Revit models in this project */}
              <div className="between" style={{ marginBottom: 8 }}>
                <span className="micro">Revit models ({folder.files.length})</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setOpenFolder(null); setManageOpen(true); }}>
                  <Icon name="Plus" size={11} /> Add model
                </button>
              </div>
              {folder.files.length === 0 ? <div className="muted" style={{ fontSize: 12, marginBottom: 18 }}>No Revit models assigned yet. Use “Add model” to assign files to this project.</div> : (
                <div className="col gap-2" style={{ marginBottom: 18 }}>
                  {folder.files.map((file) => (
                    <div key={file} className="row gap-2" style={{ padding: "7px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
                      <Icon name="Box" size={13} color="rgb(var(--accent))" />
                      <span className="mono truncate" style={{ fontSize: 11, flex: 1 }}>{file}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Users + per-user time */}
              <div className="micro" style={{ marginBottom: 8 }}>Users on this project · accumulated time</div>
              {folder.users.length === 0 ? <div className="muted" style={{ fontSize: 12, marginBottom: 16 }}>No tracked users yet.</div> : (
                <div className="col gap-2" style={{ marginBottom: 18 }}>
                  {folder.users.sort((a, b) => b.focusMin - a.focusMin).map((u) => (
                    <button key={u.id} onClick={() => onPickUser?.(u)} className="between" style={{ padding: "8px 10px", borderRadius: 10, background: "rgb(var(--bg-sunken))", textAlign: "left" }}>
                      <div className="row gap-2" style={{ minWidth: 0 }}>
                        <Avatar name={u.name} initials={u.initials} discipline={u.discipline} status={u.status} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{u.name}</div>
                          <div className="muted truncate" style={{ fontSize: 10 }}>
                            {u.sessionCount ? `${u.sessionCount} session${u.sessionCount > 1 ? "s" : ""}` : "—"}
                            {u.lastActive ? ` · last ${timeAgo(u.lastActive)}` : ""}
                          </div>
                        </div>
                      </div>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--accent))", flex: "none" }}>{fmtHM(u.focusMin)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Session history (audit trail) */}
              <SessionHistory folderFiles={folder.files} sessions={allSessions} peopleById={peopleById} />

              <button className="btn btn-secondary btn-sm" onClick={() => exportProjectFolder(folder, fmtHM)}>
                <Icon name="FileSpreadsheet" size={12} /> Export project report
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign single file modal */}
      <AnimatePresence>
        {assigning && (
          <Modal onClose={() => setAssigning(null)} title="Assign to project" subtitle={assigning.file}>
            <AssignList file={assigning.file} projects={projectRows} onDone={() => { setAssigning(null); refresh?.(); }} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Manage all assignments modal */}
      <AnimatePresence>
        {manageOpen && (
          <Modal onClose={() => setManageOpen(false)} title="Manage Revit file assignments" subtitle="Assign, move, or add Revit models to projects" wide>
            <ManageAssignments data={data} onChange={refresh} />
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Generic centered modal
function Modal({ title, subtitle, children, onClose, wide }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()} className="surface-solid"
        style={{ width: wide ? 640 : 460, maxWidth: "100%", padding: 22, maxHeight: "82vh", display: "flex", flexDirection: "column" }}>
        <div className="between" style={{ marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="X" size={15} /></button>
        </div>
        {subtitle && <div className="mono truncate" style={{ fontSize: 11, color: "rgb(var(--fg-muted))", marginBottom: 14 }}>{subtitle}</div>}
        {children}
      </motion.div>
    </motion.div>
  );
}

// Pick a project for a single file
function AssignList({ file, projects, onDone }) {
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const list = projects.filter((p) => !q || (p.code + " " + p.name).toLowerCase().includes(q.toLowerCase())).slice(0, 60);

  async function assign(projectId) {
    setSaving(true); setErr("");
    const r = await assignFileToProject(file, projectId);
    if (r.error) { setErr(r.error); setSaving(false); } else onDone?.();
  }

  return (
    <>
      <input className="input" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
      {err && <div style={{ fontSize: 11.5, color: "rgb(var(--danger))", marginBottom: 8 }}>{err}</div>}
      <div className="col gap-1" style={{ overflowY: "auto" }}>
        {list.map((p) => (
          <button key={p.id} disabled={saving} onClick={() => assign(p.id)}
            className="row gap-2" style={{ padding: "9px 11px", borderRadius: 9, textAlign: "left", background: "rgb(var(--bg-sunken))" }}>
            <Icon name="Folder" size={13} color="rgb(var(--accent))" />
            <span className="mono muted" style={{ fontSize: 10.5 }}>{p.code}</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</span>
          </button>
        ))}
        {list.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 10, textAlign: "center" }}>No matching projects.</div>}
      </div>
    </>
  );
}

// Full assignment manager: see every file, its current project, move/unassign,
// and manually add a Revit file name to assign (for files not yet auto-seen).
function ManageAssignments({ data, onChange }) {
  const { filesSeen = [], projectRows = [], folders = [] } = data;
  const [newFile, setNewFile] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const projName = (id) => { const p = projectRows.find((x) => x.id === id); return p ? p.code + " " + p.name : "—"; };

  async function setAssignment(file, projectId) {
    setBusy(file); setErr("");
    const r = await assignFileToProject(file, projectId);
    if (r.error) setErr(r.error);
    setBusy(""); onChange?.();
  }
  async function addManual() {
    const f = newFile.trim();
    if (!f) return;
    setBusy("__new"); setErr("");
    const r = await assignFileToProject(f, null);  // create row, unassigned
    if (r.error) setErr(r.error); else setNewFile("");
    setBusy(""); onChange?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* add a file manually */}
      <div className="row gap-2" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="Paste a Revit file name (e.g. ES-GA10-GA11-...-0000.rvt)" value={newFile}
          onChange={(e) => setNewFile(e.target.value)} style={{ flex: 1, fontFamily: "var(--mono)", fontSize: 11.5 }} />
        <button className="btn btn-secondary btn-sm" disabled={busy === "__new"} onClick={addManual}><Icon name="Plus" size={12} /> Add</button>
      </div>
      {err && <div style={{ fontSize: 11.5, color: "rgb(var(--danger))", marginBottom: 8 }}>{err}</div>}

      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        {filesSeen.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>
            No Revit files seen yet. Paste a file name above to start building the structure, or wait for the agent/plugin to report activity.
          </div>
        ) : filesSeen.map((f) => (
          <div key={f.file} className="between" style={{ padding: "8px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
            <div className="row gap-2" style={{ minWidth: 0, flex: 1 }}>
              <Icon name="Box" size={13} color={f.projectId ? "rgb(var(--accent))" : "rgb(var(--warning))"} />
              <span className="mono truncate" style={{ fontSize: 11 }}>{f.file}</span>
              {f.source === "revit_plugin" && <span className="pill pill-success" style={{ fontSize: 9, flex: "none" }} title="Confirmed by the Revit plugin as an opened model">verified</span>}
            </div>
            <select className="input" value={f.projectId ?? ""} disabled={busy === f.file}
              onChange={(e) => setAssignment(f.file, e.target.value ? Number(e.target.value) : null)}
              style={{ width: 200, fontSize: 11.5, flex: "none", padding: "6px 8px" }}>
              <option value="">— Unassigned —</option>
              {projectRows.map((p) => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 10 }}>
        {filesSeen.filter((f) => f.projectId != null).length} of {filesSeen.length} files assigned.
        Changing a dropdown moves that model into the chosen project immediately.
      </div>
    </div>
  );
}

// Shared write: upsert a file→project assignment in Supabase.
async function assignFileToProject(file, projectId) {
  try {
    const token = await auth.getValidToken();
    if (!token) return { error: "Sign in again to change assignments." };
    const r = await fetch(SUPABASE_URL + "/rest/v1/project_files", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: "Bearer " + token, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ file_name: file, project_id: projectId, assigned_at: new Date().toISOString() }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 || r.status === 403) return { error: "Permission denied — run 0010_projects.sql so authenticated users can assign files." };
      return { error: j.message || ("HTTP " + r.status) };
    }
    return {};
  } catch (e) { return { error: e.message }; }
}

function exportProjectFolder(folder, fmtHM) {
  const rows = folder.users.map((u) => ({
    Employee: u.name, "Revit Model": u.file, Status: u.status, "Active Time": fmtHM(u.focusMin), "Hours": u.hours.toFixed(2),
  }));
  exportReportXlsx("project-" + folder.code, folder.label + " — Project Report", rows.length ? rows : [{ Note: "No users yet" }],
    rows.length ? ["Employee", "Revit Model", "Status", "Active Time", "Hours"] : ["Note"]);
}


// Session-by-session audit trail for a project's files.
function SessionHistory({ folderFiles, sessions, peopleById }) {
  const fileSet = new Set(folderFiles || []);
  const rows = (sessions || [])
    .filter((s) => fileSet.has(s.project))
    .sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))
    .slice(0, 30);
  if (rows.length === 0) return null;
  const fmtT = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const dur = (sec) => { const m = Math.round((sec || 0) / 60); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; };
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="micro" style={{ marginBottom: 8 }}>Session history · audit trail</div>
      <div className="col gap-1" style={{ maxHeight: 240, overflowY: "auto" }}>
        {rows.map((s) => {
          const who = peopleById[s.person_id];
          return (
            <div key={s.id} className="between" style={{ padding: "7px 10px", borderRadius: 8, background: "rgb(var(--bg-sunken))" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row gap-2" style={{ marginBottom: 2 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600 }}>{who ? who.name : s.person_id}</span>
                  {s.status === "active" && <span className="pill pill-success" style={{ fontSize: 8.5 }}>active</span>}
                </div>
                <div className="muted" style={{ fontSize: 10 }}>{fmtT(s.started_at)} → {s.ended_at ? fmtT(s.ended_at) : "now"}</div>
              </div>
              <span className="tabular" style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--accent))", flex: "none" }}>{dur(s.duration_seconds)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return <div style={{ flex: 1, padding: "8px 10px", borderRadius: 9, background: "rgb(var(--bg-sunken))" }}>
    <div className="micro" style={{ fontSize: 9 }}>{label}</div>
    <div className="tabular" style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{value}</div>
  </div>;
}
