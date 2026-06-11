import { useState, useEffect, useCallback, useRef } from "react";
import { rest, mapPerson, mapEvent, deriveProjects, mergeMetrics, computeKpis, buildHeatmap, buildProjectFolders, unassignedFiles } from "./data.js";

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
      const [people_r, acts_r, att_r, mach_r, metrics_r, projects_r, files_r] = await Promise.allSettled([
        rest("people", "order=name"),
        rest("activity_events", "order=occurred_at.desc&limit=200"),
        rest("attendance", "work_date=eq." + today),
        rest("agent_machines", "select=*&order=last_seen.desc"),
        rest("project_metrics", "select=*"),
        rest("projects", "select=*&order=code"),
        rest("project_files", "select=*"),
      ]);

      if (people_r.status !== "fulfilled" || !Array.isArray(people_r.value)) {
        setLive(false);
        return;
      }
      const people = people_r.value.map(mapPerson);
      const acts = (acts_r.status === "fulfilled" ? acts_r.value : []).map(mapEvent);
      const att = att_r.status === "fulfilled" ? att_r.value : [];
      const attById = {};
      att.forEach((a) => { attById[a.id] = a; });
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
      const folders = buildProjectFolders(projectRows, fileRows, people, metricRows);
      const unassigned = unassignedFiles(fileRows, people, metricRows);

      setData({
        people, projects, activity: acts, attendance,
        kpis: computeKpis(people, projects),
        heatmap: buildHeatmap(acts),
        fleet: { total: mach.length, online, offline: mach.length - online },
        machines: mach,
        folders, unassigned,
        projectRows, fileRows,
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
