import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useEffect } from "react";
import {
  FileText,
  User,
  Briefcase,
  ListChecks,
  BookOpen,
  Sparkles,
  History,
  LayoutDashboard,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/experience", label: "Experience", icon: Briefcase },
  { to: "/projects", label: "Projects", icon: FileText },
  { to: "/skills", label: "Skills", icon: ListChecks },
  { to: "/education", label: "Education", icon: BookOpen },
  { to: "/resume/new", label: "New Resume", icon: Sparkles },
  { to: "/resume/history", label: "History", icon: History },
];

export default function AppLayout() {
  const { user, loading, init, logout } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-sm text-slate-400">Loading your workspace…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="text-lg font-semibold tracking-tight">
            <span className="text-sky-400">ResumeForge</span>{" "}
            <span className="text-amber-300">AI</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human-like, ATS-optimized resumes.
          </p>
        </div>

        <nav className="mt-4 px-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
                ${
                  isActive
                    ? "bg-sky-500/20 text-sky-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-sky-200"
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/70 backdrop-blur">
          <div className="text-sm text-slate-400">
            ✨ Build human-like resumes & cover letters tailored to each job.
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              Logged in as{" "}
              <span className="text-sky-300">
                {user.email ?? "Your account"}
              </span>
            </span>
            <button
              onClick={logout}
              className="border border-slate-700 rounded-md px-2 py-1 hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
