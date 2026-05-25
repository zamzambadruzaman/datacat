import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const mainNav = [
  { to: "/", label: "Home" },
  { to: "/assets", label: "Assets" },
  { to: "/domains", label: "Domains" },
  { to: "/teams", label: "Teams" },
];

const adminNav = [
  { to: "/users", label: "Users" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("datacat_token");
  const userEmail = localStorage.getItem("datacat_user_email");
  const isSuperadmin = localStorage.getItem("datacat_is_superadmin") === "true";

  function handleLogout() {
    localStorage.removeItem("datacat_token");
    localStorage.removeItem("datacat_user_email");
    localStorage.removeItem("datacat_is_superadmin");
    navigate("/login", { replace: true });
  }

  function NavLink({ to, label }: { to: string; label: string }) {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`rounded px-3 py-1 transition text-sm ${
          active ? "bg-indigo-800" : "hover:bg-indigo-500"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-indigo-600 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 gap-2">
          {/* Brand */}
          <Link to="/" className="text-xl font-bold tracking-tight mr-4">
            datacat
          </Link>

          {/* Main nav */}
          <div className="flex flex-1 items-center gap-1">
            {mainNav.map((n) => <NavLink key={n.to} {...n} />)}

            {/* Admin section — superadmin only */}
            {isSuperadmin && (
              <>
                <span className="mx-2 h-4 w-px bg-indigo-400 opacity-60" />
                {adminNav.map((n) => <NavLink key={n.to} {...n} />)}
              </>
            )}
          </div>

          {/* Right: badge + email + logout */}
          <div className="flex items-center gap-3 text-sm">
            {token ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  {isSuperadmin && (
                    <span className="rounded bg-amber-400 text-amber-900 px-1.5 py-0.5 text-xs font-semibold">
                      superadmin
                    </span>
                  )}
                  {userEmail && (
                    <span className="opacity-75 text-sm">{userEmail}</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded px-3 py-1 bg-indigo-800 hover:bg-indigo-900 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`rounded px-3 py-1 transition ${
                  pathname === "/login" ? "bg-indigo-800" : "hover:bg-indigo-500"
                }`}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
