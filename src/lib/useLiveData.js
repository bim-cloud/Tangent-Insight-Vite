import { useState, useEffect, useCallback, useRef } from "react";
import { rest, mapPerson, mapEvent, deriveProjects, mergeMetrics, computeKpis, buildHeatmap, buildProjectFolders, unassignedFiles, allFilesSeen } from "./data.js";

// Central live-data hook. Polls every 20s, exposes a manual refresh, and
// reports connection state. Honest empty arrays on failure (never fake names).
export function useLiveData() {
  const [data, setData] = useState({
    people: [], projects: [], activity: [], attendance: [],
    kpis: [], heatmap: { days: [], hours: [], grid: [] },
    fleet: { total: 0, online: 0, offline: 0 },
  });
  const [live, setLive] = useState(null); // null=loading, true=live, false=failed
  const [lastSync, setLastSync] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [people_r, acts_r, att_r, mach_r, metrics_r, projects_r, files_r, sessions_r, rawsessions_r, teams_r] = await Promise.allSettled([
        rest("people", "order=name"),
        rest("activity_events", "order=occurred_at.desc&limit=200"),
        rest("attendance", "work_date=eq." + today),
        rest("agent_machines", "select=*&order=last_seen.desc"),
        rest("project_metrics", "select=*"),
        rest("projects", "select=*&order=code"),
        rest("project_files", "select=*"),
        rest("v_project_user_time", "select=*"),
        rest("work_sessions", "select=*&order=started_at.desc&limit=500"),
        rest("activity_events", "kind=eq.teams&order=occurred_at.desc&limit=50"),
      ]);

      if (people_r.status !== "fulfilled" || !Array.isArray(people_r.value)) {
        setLive(false);
        return;
      }
      const people = people_r.value.map(mapPerson);
      const acts = (acts_r.status === "fulfilled" ? acts_r.value : []).map(mapEvent);
      const att = att_r.status === "fulfilled" ? att_r.value : [];
      const attById = {};
      att.forEach((a) => { attById[a.person_id || a.id] = a; });
      // Merge today's attendance clock times into each person so the
      // Attendance tab and drawer show real First-in / Last-out.
      people.forEach((p) => {
        const at = attById[p.id];
        if (at) {
          if (!p.loginTime && at.in_time) p.loginTime = at.in_time;     // "HH:MM"
          if (!p.logoutTime && at.out_time) p.logoutTime = at.out_time; // "HH:MM"
        }
      });

      const attendance = people.map((p) => ({
        ...p,
        inTime: attById[p.id]?.in_time || "—",
        outTime: attById[p.id]?.out_time || "—",
        attStatus: attById[p.id]?.status || (p.status === "offline" ? "ABSENT" : "ON_TIME"),
      }));

      let projects = deriveProjects(people);
      projects = mergeMetrics(projects, metrics_r.status === "fulfilled" ? metrics_r.value : []);

      const mach = mach_r.status === "fulfilled" ? mach_r.value : [];
      const online = mach.filter((m) => m.online).length;

      const projectRows = projects_r.status === "fulfilled" && Array.isArray(projects_r.value) ? projects_r.value : [];
      const fileRows = files_r.status === "fulfilled" && Array.isArray(files_r.value) ? files_r.value : [];
      const metricRows = metrics_r.status === "fulfilled" && Array.isArray(metrics_r.value) ? metrics_r.value : [];
      const sessionRows = sessions_r.status === "fulfilled" && Array.isArray(sessions_r.value) ? sessions_r.value : [];
      const rawSessions = rawsessions_r.status === "fulfilled" && Array.isArray(rawsessions_r.value) ? rawsessions_r.value : [];
      const teamsEvents = teams_r.status === "fulfilled" && Array.isArray(teams_r.value) ? teams_r.value.map(mapEvent) : [];
      const folders = buildProjectFolders(projectRows, fileRows, people, metricRows, sessionRows);
      const unassigned = unassignedFiles(fileRows, people, metricRows);
      const filesSeen = allFilesSeen(fileRows, people, metricRows);

      setData({
        people, projects, activity: acts, attendance,
        kpis: computeKpis(people, projects, rawSessions),
        heatmap: buildHeatmap(acts),
        fleet: { total: mach.length, online, offline: mach.length - online },
        machines: mach,
        folders, unassigned, filesSeen,
        projectRows, fileRows, sessionRows, rawSessions, teamsEvents,
      });
      setLive(true);
      setLastSync(new Date());
    } catch (e) {
      setLive(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 20000);
    return () => clearInterval(timer.current);
  }, [load]);

  return { data, live, lastSync, refresh: load };
}

// Helper available to components for byId lookups
export function byId(people, id) {
  return people.find((p) => p.id === id) || null;
}
