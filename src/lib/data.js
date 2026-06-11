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

// Canonical file key: strip the .rvt/.rfa/.rte extension, trim whitespace, and
// drop any trailing " (workshared)" / detached suffixes Revit adds, so the
// same model reported as "X", "X.rvt", "X.RVT" all collapse to ONE entry.
// This is the key used for grouping, assignment, and dedup everywhere.
export function normalizeFileName(name) {
  if (!name) return "";
  let n = String(name).trim();
  // remove a single trailing Revit extension (case-insensitive)
  n = n.replace(/\.(rvt|rfa|rte)$/i, "");
  // collapse internal whitespace
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

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
export function buildProjectFolders(projects, fileMap, people, metrics, sessions) {
  const byId = {};
  (projects || []).forEach((p) => {
    byId[p.id] = {
      id: p.id, code: p.code, name: p.name, label: p.full_label || (p.code + " " + p.name),
      status: p.status || "active",
      files: [], users: [], userIds: new Set(), lastActivity: null,
      totalFocusMin: 0, totalHours: 0, activeUsers: 0,
      worksets: 0, openViews: 0, warnings: 0, linkedModels: 0, modelSize: 0, version: "—",
    };
  });

  // The single source of truth: file_name -> project_id (explicit assignments).
  const fileToProject = {};
  (fileMap || []).forEach((f) => { if (f.project_id != null) fileToProject[normalizeFileName(f.file_name)] = f.project_id; });

  // Helper: given a central-file string, find its assigned folder id (normalized).
  function folderForFile(file) {
    if (!file || file === "—") return null;
    return fileToProject[normalizeFileName(file)] ?? null;
  }

  // Valid opened models = plugin-reported OR manually assigned OR a real model
  // someone is currently working in. All keys NORMALIZED so "X" and "X.rvt"
  // count as the same model.
  const pluginFiles = new Set();
  (metrics || []).forEach((m) => { if (m.source === "revit_plugin" && looksLikeModel(m.project)) pluginFiles.add(normalizeFileName(m.project)); });
  Object.keys(fileToProject).forEach((f) => pluginFiles.add(f));   // manual assignments (already normalized)
  (people || []).forEach((p) => { if (looksLikeModel(p.project)) pluginFiles.add(normalizeFileName(p.project)); });

  // 1) Roll up per-file METRICS into the assigned folder (normalized keys).
  (metrics || []).forEach((m) => {
    const key = normalizeFileName(m.project);
    if (!pluginFiles.has(key)) return;           // skip non-opened (links/agent) files
    const pid = folderForFile(m.project);
    if (pid == null || !byId[pid]) return;
    const folder = byId[pid];
    if (!folder.files.includes(key)) folder.files.push(key);   // store normalized, dedup
    folder.worksets += m.worksets || 0;
    folder.openViews += m.open_views || 0;
    folder.warnings += m.warnings || 0;
    folder.linkedModels += m.linked_models || 0;
    folder.modelSize += m.size_mb || 0;
    if (m.revit_version) folder.version = m.revit_version;
    if (m.updated_at && (!folder.lastActivity || m.updated_at > folder.lastActivity)) folder.lastActivity = m.updated_at;
  });

  // 2) Roll up PEOPLE present in a folder's files (for the "who/status" list).
  (people || []).forEach((p) => {
    if (!pluginFiles.has(normalizeFileName(p.project))) return;
    const pid = folderForFile(p.project);
    if (pid == null || !byId[pid]) return;
    const folder = byId[pid];
    if (!folder.userIds.has(p.id)) {
      folder.userIds.add(p.id);
      folder.users.push({
        id: p.id, name: p.name, initials: p.initials, discipline: p.discipline,
        status: p.status, focusMin: 0, hours: 0, sessionCount: 0, lastActive: null, file: p.project,
      });
    }
  });

  // 2b) Layer in ACCUMULATED session time (the source of truth for hours).
  //     v_project_user_time gives summed seconds per (project file, person).
  //     We attribute each file's sessions to its folder, summing across files.
  //     Keys NORMALIZED so session rows match assigned files regardless of .rvt.
  (sessions || []).forEach((s) => {
    const pid = folderForFile(s.project);
    if (pid == null || !byId[pid]) return;
    const folder = byId[pid];
    const mins = Math.round((s.total_seconds || 0) / 60);
    const hours = +(s.total_hours || 0);
    let u = folder.users.find((x) => x.id === s.person_id);
    if (!u) {
      // a user who has sessions but isn't currently "in" the file
      u = { id: s.person_id, name: s.person_id, initials: (s.person_id || "?").slice(0, 2).toUpperCase(),
        discipline: "UNASSIGNED", status: "offline", focusMin: 0, hours: 0, sessionCount: 0, lastActive: null, file: s.project };
      folder.userIds.add(s.person_id);
      folder.users.push(u);
    }
    u.focusMin += mins;
    u.hours += hours;
    u.sessionCount += s.session_count || 0;
    if (s.last_active && (!u.lastActive || s.last_active > u.lastActive)) u.lastActive = s.last_active;
    if (s.last_active && (!folder.lastActivity || s.last_active > folder.lastActivity)) folder.lastActivity = s.last_active;
  });

  // Resolve real names for session-only users from the people list.
  const peopleById = {};
  (people || []).forEach((p) => { peopleById[p.id] = p; });
  Object.values(byId).forEach((folder) => {
    folder.users.forEach((u) => {
      const pp = peopleById[u.id];
      if (pp) { u.name = pp.name; u.initials = pp.initials; u.discipline = pp.discipline;
        if (u.status === "offline") u.status = pp.status; }
    });
  });

  // 3) Finalize aggregates — totals are the SUM of accumulated session time.
  Object.values(byId).forEach((folder) => {
    folder.activeUsers = folder.users.filter((u) => u.status !== "offline").length;
    folder.totalFocusMin = folder.users.reduce((a, u) => a + u.focusMin, 0);
    folder.totalHours = folder.users.reduce((a, u) => a + u.hours, 0);
    delete folder.userIds;
  });

  return Object.values(byId);
}

// A file is a real OPENED working model only if the Revit PLUGIN reported it.
// The plugin reports the host document the user opened and never reports links,
// so source==='revit_plugin' is the authoritative signal. Agent rows (window-
// title based) are NOT trusted for the project list, since the agent cannot
// tell a host model from a linked one.
//
// metricsBySource: map of file_name -> source, built from project_metrics.
export function isOpenedModel(file, metricsBySource) {
  return metricsBySource && metricsBySource[file] === "revit_plugin";
}

export function allFilesSeen(fileMap, people, metrics) {
  // assignments keyed by normalized name
  const assigned = {};
  (fileMap || []).forEach((f) => {
    if (f.project_id != null) assigned[normalizeFileName(f.file_name)] = f.project_id;
  });

  // best display name + source per normalized key
  const display = {};   // norm -> nicest display string
  const sourceOf = {};  // norm -> source

  function consider(rawName, source) {
    if (!rawName || rawName === "—" || rawName === "Multi") return;
    if (!looksLikeModel(rawName)) return;
    const key = normalizeFileName(rawName);
    if (!key) return;
    // Prefer a display name WITHOUT extension (cleaner), but keep first seen.
    if (!display[key]) display[key] = key;
    // plugin source wins as the authority marker
    if (source === "revit_plugin" || !sourceOf[key]) sourceOf[key] = source;
  }

  (metrics || []).forEach((m) => consider(m.project, m.source || "agent"));
  (people || []).forEach((p) => consider(p.project, "active"));

  // Always include assigned files (human vouched), even if not currently seen.
  Object.keys(assigned).forEach((key) => { if (!display[key]) display[key] = key; });

  // Build deduped list keyed by normalized name.
  return Object.keys(display).map((key) => ({
    file: key,                                   // canonical (normalized) name
    projectId: assigned[key] ?? null,
    source: sourceOf[key] || (assigned[key] != null ? "manual" : "active"),
  }));
}

// Lightweight sanity filter (NOT the link gate — the plugin source is the real
// authority). Keeps real working models, drops obvious underlays/families.
function looksLikeModel(name) {
  const lower = String(name).toLowerCase().trim();
  if (!lower) return false;
  // Drop non-Revit underlay/reference file types.
  if (/\.(dwg|ifc|nwc|nwd|rfa|rte|skp|pdf|dgn)$/.test(lower)) return false;
  // Drop Revit backups: name.0001
  if (/\.\d{4}$/.test(lower)) return false;
  return true;
}

// Files not yet assigned to any folder.
export function unassignedFiles(fileMap, people, metrics) {
  return allFilesSeen(fileMap, people, metrics).filter((f) => f.projectId == null).map((f) => f.file);
}
