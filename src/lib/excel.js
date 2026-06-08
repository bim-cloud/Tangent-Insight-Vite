// ============================================================
// Excel export pipeline (SheetJS / xlsx)
// Produces real .xlsx workbooks. Until the official Tangent template
// is provided, this uses a clean professional layout with branded
// header rows, column widths, and summary sheets. Swap styling here
// once the template .xlsx is shared.
// ============================================================
import * as XLSX from "xlsx";
import { toast } from "./util.js";

const BRAND = "Tangent Landscape Architecture";

function aoaSheet(rows, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  return ws;
}

function stamp(name) {
  return `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

// ---- Attendance / activity report ----
export function exportAttendanceXlsx(people, opts = {}) {
  const { rangeLabel = "Today" } = opts;
  const wb = XLSX.utils.book_new();

  const header = [
    [BRAND],
    ["Workforce Attendance & Activity Report"],
    [`Range: ${rangeLabel}`, "", "", `Generated: ${new Date().toLocaleString("en-GB")}`],
    [],
    ["Employee", "Email", "Department", "Role", "Status", "Login", "Logout",
     "Active (h)", "Idle (h)", "Total PC (h)", "Productive (h)", "Overtime (h)", "Utilization %"],
  ];
  const body = people.map((p) => {
    const activeH = +(p.focusMin / 60).toFixed(2);
    const idleH = +(p.idleMin / 60).toFixed(2);
    const totalH = +((p.focusMin + p.idleMin) / 60).toFixed(2);
    return [
      p.name, p.email, p.dept, p.role, p.status,
      p.loginTime || "—", p.logoutTime || "—",
      activeH, idleH, totalH, +p.hours.toFixed(2), +p.ot.toFixed(2), p.utilization,
    ];
  });
  // Totals row
  const tot = (key) => people.reduce((a, p) => a + (+p[key] || 0), 0);
  const totals = ["TOTAL", "", "", "", "", "", "",
    +(tot("focusMin") / 60).toFixed(2), +(tot("idleMin") / 60).toFixed(2),
    +((tot("focusMin") + tot("idleMin")) / 60).toFixed(2),
    +tot("hours").toFixed(2), +tot("ot").toFixed(2),
    people.length ? Math.round(people.reduce((a, p) => a + p.utilization, 0) / people.length) : 0];

  const ws = aoaSheet([...header, ...body, [], totals],
    [24, 30, 16, 22, 10, 10, 10, 11, 10, 12, 13, 12, 13]);
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, stamp("tangent-attendance"));
  toast(`Exported ${people.length} employees to Excel`, "success");
}

// ---- Project report (user-wise + project-wise sheets) ----
export function exportProjectsXlsx(projects, people) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — project-wise
  const pHeader = [
    [BRAND], ["Project Productivity Report"],
    [`Generated: ${new Date().toLocaleString("en-GB")}`], [],
    ["Project", "Active Users", "Total Users", "Worksets", "Open Views",
     "Warnings", "Linked Models", "Model Size (MB)", "Revit Version"],
  ];
  const pBody = projects.map((p) => [
    p.code, p.activeUsers, p.totalUsers, p.worksets, p.openViews,
    p.warnings, p.linkedModels, p.modelSize, p.version,
  ]);
  XLSX.utils.book_append_sheet(wb,
    aoaSheet([...pHeader, ...pBody], [28, 12, 11, 10, 11, 10, 13, 15, 13]), "Projects");

  // Sheet 2 — user-wise (who's on which project, hours)
  const uHeader = [
    [BRAND], ["User Contribution by Project"], [], 
    ["Employee", "Department", "Current Project", "Active (h)", "Idle (h)", "Hours Today", "Utilization %"],
  ];
  const uBody = people.map((p) => [
    p.name, p.dept, p.project,
    +(p.focusMin / 60).toFixed(2), +(p.idleMin / 60).toFixed(2),
    +p.hours.toFixed(2), p.utilization,
  ]);
  XLSX.utils.book_append_sheet(wb,
    aoaSheet([...uHeader, ...uBody], [24, 16, 28, 11, 10, 12, 13]), "By User");

  XLSX.writeFile(wb, stamp("tangent-projects"));
  toast("Exported project report to Excel", "success");
}

// ---- Generic report-builder export ----
export function exportReportXlsx(name, title, rows, fields) {
  if (!rows || !rows.length) { toast("Nothing to export", "warning"); return; }
  const wb = XLSX.utils.book_new();
  const header = [[BRAND], [title], [`Generated: ${new Date().toLocaleString("en-GB")}`], [], fields];
  const body = rows.map((r) => fields.map((f) => r[f]));
  XLSX.utils.book_append_sheet(wb, aoaSheet([...header, ...body], fields.map(() => 18)), "Report");
  XLSX.writeFile(wb, stamp(name));
  toast(`Exported ${rows.length} rows to Excel`, "success");
}
