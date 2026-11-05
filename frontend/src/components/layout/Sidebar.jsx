import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/common/Avatar";

const menuItems = [
  { name: "Overview", to: "/dashboard", end: true, icon: "⌂" },
  { name: "Objects", to: "/dashboard/objects", icon: "◉" },
  { name: "Spaces", to: "/dashboard/spaces", icon: "▣" },
  { name: "Google Photos", to: "/dashboard/photos", icon: "▧" },
  { name: "Settings", to: "/dashboard/settings", icon: "⚙" },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    onClose();
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white text-slate-600 shadow-xl transition-transform duration-300 ease-out lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 lg:h-[5.8rem] lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-trace-600 font-bold text-white">
              S
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ink">SpaceTrace</h1>
              <p className="truncate text-xs text-slate-500">{user?.name ?? ""}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workspace
          </p>

          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition lg:py-2.5 ${
                  isActive
                    ? "bg-[#EEF2FF] text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`
              }
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <Avatar src={user?.avatar_url} name={user?.name ?? user?.email} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {user?.name ?? user?.email ?? "..."}
              </p>
              <p className="truncate text-xs text-slate-500">{user?.email ?? ""}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}