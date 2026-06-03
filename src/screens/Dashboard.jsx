import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import KPICard from "../components/KPICard.jsx";
import { Icon, CardTitle, Avatar, Pill } from "../components/primitives.jsx";
import { staggerGrid, riseItem, spring } from "../motion/variants.js";
import { exportCsv } from "../lib/util.js";

const STATUS_COLORS = { online: "#10b981", meeting: "#a78bfa", idle: "#f59e0b", offline: "#475569" };

export default function Dashboard({ data, setRoute }) {
  const { people, kpis, activity, heatmap } = data;

  // Workforce by department (real)
  const byDept = {};
  people.forEach((p) => { byDept[p.dept] = (byDept[p.dept] || 0) + 1; });
  const deptData = Object.entries(byDept).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);

  // Status distribution (real)
  const statusCount = { online: 0, meeting: 0, idle: 0, offline: 0 };
  people.forEach((p) => { statusCount[p.status] = (statusCount[p.status] || 0) + 1; });
  const statusData = Object.entries(statusCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // Activity over the day (real, bucketed)
  const hourBuckets = Array.from({ length: 12 }, (_, i) => ({ h: i + 8, count: 0 }));
  activity.forEach((a) => { if (a.at) { const h = new Date(a.at).getHours() - 8; if (h >= 0 && h < 12) hourBuckets[h].count++; } });

  return (
    <motion.div variants={staggerGrid} initial="initial" animate="animate">
      {/* KPI grid */}
      <motion.div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }} variants={staggerGrid}>
        {kpis.map((k) => <KPICard key={k.key} k={k} onNavigate={setRoute} />)}
      </motion.div>

      {/* Row: workforce + status */}
      <motion.div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 16 }} variants={riseItem}>
        <div className="surface" style={{ padding: "var(--pad-card)" }}>
          <CardTitle title="Workforce by department" subtitle="Live headcount" icon="Building2"
            right={<button className="btn btn-secondary btn-sm" onClick={() => exportCsv("workforce", deptData)}><Icon name="Download" size={12} /> Export</button>} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptData}>
              <XAxis dataKey="name" tick={{ fill: "rgb(130 140 158)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(34,211,238,0.06)" }}
                contentStyle={{ background: "rgb(17 21 32)", border: "1px solid rgb(38 44 60)", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="url(#barGrad)" animationDuration={900} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface" style={{ padding: "var(--pad-card)" }}>
          <CardTitle title="Team status" subtitle="Right now" icon="Activity" />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} animationDuration={900}>
                {statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "rgb(17 21 32)", border: "1px solid rgb(38 44 60)", borderRadius: 10, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="row" style={{ flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {statusData.map((s) => (
              <div key={s.name} className="row gap-2" style={{ fontSize: 11.5 }}>
                <span className="dot" style={{ background: STATUS_COLORS[s.name] }} />
                <span style={{ textTransform: "capitalize" }}>{s.name}</span>
                <span className="tabular muted">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Row: activity trend + live feed */}
      <motion.div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 16 }} variants={riseItem}>
        <div className="surface" style={{ padding: "var(--pad-card)" }}>
          <CardTitle title="Activity through the day" subtitle="Events per hour · from agent + Revit plugin" icon="LineChart" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourBuckets}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="h" tickFormatter={(h) => h + ":00"} tick={{ fill: "rgb(130 140 158)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "rgb(17 21 32)", border: "1px solid rgb(38 44 60)", borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fill="url(#areaGrad)" animationDuration={1000} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="surface" style={{ padding: "var(--pad-card)" }}>
          <CardTitle title="Live activity" subtitle={activity.length + " recent events"} icon="Zap"
            right={<button className="btn btn-ghost btn-sm" onClick={() => setRoute("live")}>View all</button>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 230, overflowY: "auto" }} className="no-scrollbar">
            {activity.slice(0, 12).map((a) => {
              const u = people.find((p) => p.id === a.user);
              return (
                <motion.div key={a.id} className="row gap-3" style={{ padding: "6px 4px" }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                  <span className="dot" style={{ background: "rgb(var(--accent))", flex: "none" }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="truncate" style={{ fontSize: 12 }}>
                      <b>{u ? u.name : "System"}</b> <span className="muted">{a.detail}</span>
                    </div>
                  </div>
                  <span className="muted tabular" style={{ fontSize: 10.5, flex: "none" }}>{a.t < 1 ? "now" : a.t + "m"}</span>
                </motion.div>
              );
            })}
            {activity.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 16, textAlign: "center" }}>No activity captured yet.</div>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
