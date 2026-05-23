import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/assets", label: "Assets" },
  { to: "/domains", label: "Domains" },
  { to: "/teams", label: "Teams" },
  { to: "/users", label: "Users" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("datacat_token");
  const userEmail = localStorage.getItem("datacat_user_email");

  function handleLogout() {
    localStorage.removeItem("datacat_token");
    localStorage.removeItem("datacat_user_email");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-indigo-600 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            datacat
          </Link>
          <div className="flex flex-1 gap-4 text-sm">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded px-3 py-1 transition ${
                  pathname === n.to ? "bg-indigo-800" : "hover:bg-indigo-500"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {token ? (
              <>
                {userEmail && (
                  <span className="opacity-75 hidden sm:block">{userEmail}</span>
                )}
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
