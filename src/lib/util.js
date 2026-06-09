// Lightweight export + toast utilities.
let toastFn = null;
export function registerToast(fn) { toastFn = fn; }
export function toast(msg, kind = "info") { if (toastFn) toastFn(msg, kind); }

function download(filename, data, mime) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 100);
}

function csvEscape(v) {
  if (v == null) return "";
  if (Array.isArray(v)) v = v.join("; ");
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const stamp = (name) => `${name || "tangent-export"}-${new Date().toISOString().slice(0, 10)}`;

export function exportCsv(name, rows, fields) {
  if (!rows || !rows.length) { toast("Nothing to export", "warning"); return; }
  fields = fields || Object.keys(rows[0]);
  const csv = [fields.join(","), ...rows.map((r) => fields.map((f) => csvEscape(r[f])).join(","))].join("\n");
  download(stamp(name) + ".csv", csv, "text/csv;charset=utf-8");
  toast(`Exported ${rows.length} rows`, "success");
}

export function copyText(text) {
  if (!text) { toast("Nothing to copy", "warning"); return; }
  (navigator.clipboard?.writeText(text) || Promise.reject()).then(
    () => toast("Copied to clipboard", "success"),
    () => toast("Copy failed", "warning")
  );
}
