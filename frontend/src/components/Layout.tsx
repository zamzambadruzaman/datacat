import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/assets", label: "Assets" },
  { to: "/domains", label: "Domains" },
  { to: "/teams", label: "Teams" },
  { to: "/login", label: "Login" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top nav */}
      <nav className="bg-indigo-600 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-3">
          <Link to="/" className="text-xl font-bold tracking-tight">
            datacat
          </Link>
          <div className="flex gap-4 text-sm">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded px-3 py-1 transition ${
                  pathname === n.to
                    ? "bg-indigo-800"
                    : "hover:bg-indigo-500"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
