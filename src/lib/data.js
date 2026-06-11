// ============================================================
// Tangent Insight — Supabase data layer (Vite / ES modules)
// Same backend, same tables as the previous app; ported clean.
// ============================================================

export const SUPABASE_URL  = "https://txbhogmhonwdsjkvnnur.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4YmhvZ21ob253ZHNqa3ZubnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODA2MTcsImV4cCI6MjA5NDc1NjYxN30.Fd753UA1UmI12i1LCOlvTc0TFBqhlBKaWgTn9YcyZVQ";

export function rest(table, query, token) {
  return fetch(SUPABASE_URL + "/rest/v1/" + table + (query ? "?" + query : ""), {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: "Bearer " + (token || SUPABASE_ANON),
    },
  }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
}

const num = (v) => (v == null || isNaN(+v) ? 0 : +v);
const inits = (name) =>
  (name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function mapPerson(r) {
  const focusMin = num(r.focus_min);
  const idleMin = num(r.idle_min);
  // The agent normally fills hours/utilization server-side. If those are
  // zero/null but we DO have activity minutes, derive them so the UI never
  // shows a misleading 0h / 0% for someone who's clearly been active.
  let hours = num(r.hours);
  if (!hours && focusMin > 0) hours = +(focusMin / 60).toFixed(2);
  let utilization = num(r.utilization);
  if (!utilization && focusMin + idleMin > 0) {
    utilization = Math.round((focusMin / (focusMin + idleMin)) * 100);
  }
  return {
    id: r.id, name: r.name, initials: r.initials || inits(r.name),
    role: r.role || "Staff", discipline: r.discipline || "UNASSIGNED",
    dept: r.dept || "Unassigned", status: r.status || "offline",
    project: r.project || "—", version: r.version || "—",
    focusMin, idleMin, hours, ot: num(r.ot), utilization,
    machine: r.machine || "—", email: r.email || "", username: r.username || "",
    isAdmin: !!r.is_admin,
    onlineSince: r.online_since || null,
    loginTime: r.login_time || null, logoutTime: r.logout_time || null,
  };
}

export function mapEvent(r) {
  const mins = r.occurred_at ? Math.max(0, Math.round((Date.now() - new Date(r.occurred_at)) / 60000)) : 0;
  return { id: r.id, kind: r.kind, user: r.user_id, project: r.project || "—",
    detail: r.detail || "", t: mins, at: r.occurred_at, source: r.source };
}

const STAGE = ["Concept", "Schematic", "Detailed", "Technical", "Construction"];

export function deriveProjects(people) {
  const byCentral = {};
  people.forEach((p) => {
    if (!p.project || p.project === "—" || p.project === "Multi") return;
    (byCentral[p.project] = byCentral[p.project] || []).push(p);
  });
  return Object.keys(byCentral).map((code, i) => {
    const team = byCentral[code];
    const active = team.filter((p) => p.status !== "offline").length;
    const warnings = 0;
    return {
      code, central: code, activeUsers: active, totalUsers: team.length,
      worksets: 0, openViews: 0, warnings, errors: 0, clashes: 0,
      linkedModels: 0, modelSize: 0, version: team[0].version || "—",
      stage: STAGE[i % STAGE.length], health: active > 0 ? "active" : "idle",
      progress: 0, team: team.map((p) => p.id),
    };
  });
}

export function mergeMetrics(projects, metrics) {
  const byProj = {};
  (metrics || []).forEach((m) => { byProj[m.project] = m; });
  projects.forEach((p) => {
    const m = byProj[p.code];
    if (m) {
      p.worksets = m.worksets || 0;
      p.openViews = m.open_views || 0;
      p.warnings = m.warnings || 0;
      p.linkedModels = m.linked_models || 0;
      p.modelSize = m.size_mb || 0;
      p.version = m.revit_version || p.version;
      p.lastUser = m.last_user;
      p.updatedAt = m.updated_at;
    }
  });
  return projects;
}

export function computeKpis(people, projects) {
  const online = people.filter((p) => p.status !== "offline").length;
  const meeting = people.filter((p) => p.status === "meeting").length;
  const totalHours = people.reduce((a, p) => a + p.hours, 0);
  const totalOt = people.reduce((a, p) => a + p.ot, 0);
  const activeProjects = projects.filter((p) => p.activeUsers > 0).length;
  const spark = (base) => Array.from({ length: 12 }, (_, i) => base * (0.6 + 0.4 * Math.sin(i / 2)));
  return [
    { key: "projects", label: "Active Revit Projects", value: activeProjects, delta: 0, icon: "FolderKanban", grad: "var(--grad-cyan)", spark: spark(activeProjects || 1) },
    { key: "online", label: "Users Online Now", value: online, delta: 0, icon: "Users", grad: "var(--grad-emerald)", spark: spark(online || 1) },
    { key: "meeting", label: "In Teams Meetings", value: meeting, delta: 0, icon: "Video", grad: "var(--grad-violet)", spark: spark(meeting || 1) },
    { key: "hours", label: "Active Work Hours · Today", value: +totalHours.toFixed(1), suffix: "h", delta: 0, icon: "Clock", grad: "var(--grad-cyan)", spark: spark(totalHours || 1) },
    { key: "overtime", label: "Overtime · Today", value: +totalOt.toFixed(1), suffix: "h", delta: 0, icon: "Timer", grad: "var(--grad-amber)", spark: spark(totalOt || 1) },
    { key: "staff", label: "Total Staff Tracked", value: people.length, delta: 0, icon: "UserCheck", grad: "var(--grad-violet)", spark: spark(people.length || 1) },
  ];
}

// Build a day×hour heatmap from real event timestamps
export function buildHeatmap(events) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8..19
  const grid = days.map(() => hours.map(() => 0));
  (events || []).forEach((e) => {
    if (!e.at) return;
    const d = new Date(e.at);
    const day = (d.getDay() + 6) % 7; // Mon=0
    const h = d.getHours() - 8;
    if (h >= 0 && h < 12) grid[day][h]++;
  });
  return { days, hours, grid };
}

export const ROUTE_FOR_KPI = {
  projects: "revit", online: "live", meeting: "teams",
  hours: "analytics", overtime: "reports", staff: "employees",
};

// Build project folders from explicit file→project assignments.
//
// Reality: Revit file names (ES-GA10-GA11-TAN-DRG-...) are unrelated to the
// Excel project codes (1928-GA11 Emaar South). There is no reliable way to
// auto-derive one from the other, so assignment is EXPLICIT: a user maps each
// central file to a project once, and from then on ALL activity from that file
// (metrics + the people working in it) rolls up to the project folder.
//
// projects : rows from public.projects
// fileMap  : rows from public.project_files (file_name -> project_id)
// people   : mapped people; p.project = the central file they're in (or its code)
// metrics  : project_metrics rows, one per central file (m.project = file name)
export function buildProjectFolders(projects, fileMap, people, metrics) {
  const byId = {};
  (projects || []).forEach((p) => {
    byId[p.id] = {
      id: p.id, code: p.code, name: p.name, label: p.full_label || (p.code + " " + p.name),
      status: p.status || "active",
      files: [], users: [], userIds: new Set(),
      totalFocusMin: 0, totalHours: 0, activeUsers: 0,
      worksets: 0, openViews: 0, warnings: 0, linkedModels: 0, modelSize: 0, version: "—",
    };
  });

  // The single source of truth: file_name -> project_id (explicit assignments).
  const fileToProject = {};
  (fileMap || []).forEach((f) => { if (f.project_id != null) fileToProject[f.file_name] = f.project_id; });

  // Helper: given a central-file string, find its assigned folder id.
  function folderForFile(file) {
    if (!file || file === "—") return null;
    return fileToProject[file] ?? null;
  }

  // 1) Roll up per-file METRICS into the assigned folder.
  (metrics || []).forEach((m) => {
    const pid = folderForFile(m.project);
    if (pid == null || !byId[pid]) return;
    const folder = byId[pid];
    if (!folder.files.includes(m.project)) folder.files.push(m.project);
    folder.worksets += m.worksets || 0;
    folder.openViews += m.open_views || 0;
    folder.warnings += m.warnings || 0;
    folder.linkedModels += m.linked_models || 0;
    folder.modelSize += m.size_mb || 0;
    if (m.revit_version) folder.version = m.revit_version;
  });

  // 2) Roll up PEOPLE (their working time) into the folder of the file they're in.
  (people || []).forEach((p) => {
    const pid = folderForFile(p.project);
    if (pid == null || !byId[pid]) return;
    const folder = byId[pid];
    if (folder.userIds.has(p.id)) {
      // already counted (same person could appear once); accumulate time
      const existing = folder.users.find((u) => u.id === p.id);
      if (existing) { existing.focusMin += p.focusMin; existing.hours += p.hours; }
    } else {
      folder.userIds.add(p.id);
      folder.users.push({
        id: p.id, name: p.name, initials: p.initials, discipline: p.discipline,
        status: p.status, focusMin: p.focusMin, hours: p.hours, file: p.project,
      });
    }
  });

  // 3) Finalize aggregates.
  Object.values(byId).forEach((folder) => {
    folder.activeUsers = folder.users.filter((u) => u.status !== "offline").length;
    folder.totalFocusMin = folder.users.reduce((a, u) => a + u.focusMin, 0);
    folder.totalHours = folder.users.reduce((a, u) => a + u.hours, 0);
    delete folder.userIds; // not serializable / not needed downstream
  });

  return Object.values(byId);
}

// Every distinct central file the system has seen (from metrics OR people),
// each tagged with its current assignment (project_id or null).
export function allFilesSeen(fileMap, people, metrics) {
  const assigned = {};
  (fileMap || []).forEach((f) => { if (f.project_id != null) assigned[f.file_name] = f.project_id; });
  const seen = new Set();
  (metrics || []).forEach((m) => { if (m.project && m.project !== "—") seen.add(m.project); });
  (people || []).forEach((p) => { if (p.project && p.project !== "—") seen.add(p.project); });
  return [...seen].map((file) => ({ file, projectId: assigned[file] ?? null }));
}

// Files not yet assigned to any folder.
export function unassignedFiles(fileMap, people, metrics) {
  return allFilesSeen(fileMap, people, metrics).filter((f) => f.projectId == null).map((f) => f.file);
}
