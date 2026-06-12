import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ArchBackground from "./screens/ArchBackground.jsx";

// Lightweight device-tier check (was in the Three layer; inlined so Three.js
// drops out of the bundle entirely now that the WebGL background is gone).
function detectTier() {
  if (typeof navigator === "undefined") return "mid";
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return "off";
  if (mobile && (mem <= 4 || cores <= 4)) return "low";
  if (mem <= 4 || cores <= 4) return "mid";
  return "high";
}
import { Sidebar, Topbar } from "./components/Shell.jsx";
import { ToastProvider } from "./components/primitives.jsx";
import { useLenis } from "./motion/hooks.js";
import { pageVariants } from "./motion/variants.js";
import { useLiveData } from "./lib/useLiveData.js";
import { auth } from "./lib/auth.js";
import Login from "./screens/Login.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import WelcomeScreen from "./screens/WelcomeScreen.jsx";
import {
  RevitScreen, LiveScreen, TeamsScreen, EmployeesScreen,
  AnalyticsScreen, ReportsScreen, HistoryScreen, AdminScreen, SettingsScreen,
} from "./screens/screens.jsx";
import { AttendanceScreen, ProjectsScreen, EmployeeDrawer } from "./screens/extra.jsx";

const META = {
  dashboard: { title: "Executive Dashboard", subtitle: "Live BIM intelligence across the studio" },
  revit: { title: "Project Monitoring", subtitle: "Central models, worksets, warnings — from the Revit plugin" },
  projects: { title: "Projects", subtitle: "Active projects, contributors, and resource allocation" },
  live: { title: "Live Users", subtitle: "Who's working right now" },
  teams: { title: "Teams Activity", subtitle: "Meeting presence and call activity" },
  employees: { title: "Employee Overview", subtitle: "Everyone tracked by the platform" },
  attendance: { title: "Attendance", subtitle: "Daily attendance · active vs idle time" },
  analytics: { title: "Work Analytics", subtitle: "Productivity, utilization, focus" },
  reports: { title: "Reports & Export", subtitle: "Build and download live reports" },
  history: { title: "Activity History", subtitle: "The full activity archive" },
  admin: { title: "Autodesk ID Manager", subtitle: "License usage and ID sharing" },
  settings: { title: "Settings", subtitle: "Your profile and preferences" },
};

const MOTION_ORDER = ["high", "mid", "low", "off"];

export default function App() {
  const [session, setSession] = useState(auth.getSession());
  const [route, setRoute] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("ti.theme") || "light");
  const [motionQuality, setMotionQuality] = useState(() => localStorage.getItem("ti.motion") || detectTier());
  const [showWelcome, setShowWelcome] = useState(() => !sessionStorage.getItem("ti.welcomed"));
  const [drawerUser, setDrawerUser] = useState(null);

  const { data, live, refresh } = useLiveData();
  useLenis();

  useEffect(() => auth.onChange(setSession), []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("ti.theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("ti.motion", motionQuality); }, [motionQuality]);

  const me = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return null;
    return data.people.find((p) => (p.email || "").toLowerCase() === email.toLowerCase()) || null;
  }, [session, data.people]);

  const cycleMotion = () => setMotionQuality((q) => MOTION_ORDER[(MOTION_ORDER.indexOf(q) + 1) % MOTION_ORDER.length]);

  if (!session) {
    return (
      <ToastProvider>
        <Login onSignedIn={() => setSession(auth.getSession())} />
      </ToastProvider>
    );
  }

  const meta = META[route] || META.dashboard;
  const screenProps = { data, setRoute, me, refresh };

  function renderScreen() {
    switch (route) {
      case "revit": return <RevitScreen {...screenProps} />;
      case "projects": return <ProjectsScreen {...screenProps} onPickUser={setDrawerUser} />;
      case "live": return <LiveScreen {...screenProps} />;
      case "teams": return <TeamsScreen {...screenProps} />;
      case "employees": return <EmployeesScreen {...screenProps} onPickUser={setDrawerUser} />;
      case "attendance": return <AttendanceScreen {...screenProps} onPickUser={setDrawerUser} />;
      case "analytics": return <AnalyticsScreen {...screenProps} />;
      case "reports": return <ReportsScreen {...screenProps} />;
      case "history": return <HistoryScreen {...screenProps} />;
      case "admin": return <AdminScreen {...screenProps} />;
      case "settings": return <SettingsScreen {...screenProps} />;
      default: return <Dashboard {...screenProps} />;
    }
  }

  return (
    <ToastProvider>
      <ArchBackground variant="dashboard" theme={theme} static />
      <AnimatePresence>
        {showWelcome && motionQuality !== "off" && (
          <WelcomeScreen key="welcome" name={me?.name}
            onDone={() => { setShowWelcome(false); sessionStorage.setItem("ti.welcomed", "1"); }} />
        )}
      </AnimatePresence>
      <Sidebar route={route} setRoute={setRoute} me={me} />
      <main style={{ marginLeft: 248, padding: "24px 28px 60px", position: "relative", zIndex: 1 }}>
        <Topbar
          title={meta.title} subtitle={meta.subtitle}
          theme={theme} setTheme={setTheme}
          motionQuality={motionQuality} cycleMotion={cycleMotion}
          onSignOut={() => auth.signOut()} refresh={refresh} live={live}
        />
        <AnimatePresence mode="wait">
          <motion.div key={route} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      {drawerUser && <EmployeeDrawer person={drawerUser} activity={data.activity} sessions={data.rawSessions} onClose={() => setDrawerUser(null)} />}
    </ToastProvider>
  );
}
