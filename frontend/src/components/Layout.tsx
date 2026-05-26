import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchMe } from "../api";

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

  const [avatar, setAvatar] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetchMe()
      .then((u) => {
        setAvatar(u.avatar || "");
        setDisplayName(u.name || "");
      })
      .catch(() => {});
  }, [token, pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-fuchsia-800 text-white shadow-sm"
            : "text-gray-500 hover:text-fuchsia-800 hover:bg-fuchsia-100"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 gap-2">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 mr-5 group">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-800 flex items-center justify-center flex-shrink-0 group-hover:bg-fuchsia-900 transition-colors">
              {/* Database with cat ears */}
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {/* Left cat ear */}
                <path d="M4 13L7 7L10 13" />
                {/* Right cat ear */}
                <path d="M14 13L17 7L20 13" />
                {/* Cylinder top ellipse */}
                <path d="M4 13c0 1.1 3.58 2 8 2s8-.9 8-2s-3.58-2-8-2s-8 .9-8 2z" />
                {/* Cylinder body */}
                <path d="M4 13v6c0 1.1 3.58 2 8 2s8-.9 8-2v-6" />
                {/* Middle data line */}
                <path d="M4 16.5c0 1.1 3.58 2 8 2s8-.9 8-2" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-fuchsia-800 group-hover:text-fuchsia-900 transition-colors">
              datacat
            </span>
          </Link>

          {/* Main nav */}
          <div className="flex flex-1 items-center gap-1">
            {mainNav.map((n) => <NavLink key={n.to} {...n} />)}

            {isSuperadmin && (
              <>
                <span className="mx-2 h-4 w-px bg-gray-200" />
                {adminNav.map((n) => <NavLink key={n.to} {...n} />)}
              </>
            )}
          </div>

          {/* Right: avatar dropdown */}
          <div className="flex items-center gap-3 text-sm">
            {token ? (
              <>
                {/* User menu with hover/click dropdown */}
                <div
                  ref={dropdownRef}
                  className="relative hidden sm:block"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-fuchsia-100 transition-all duration-150"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="avatar"
                        className="w-7 h-7 rounded-full object-cover border border-fuchsia-300"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-fuchsia-200 flex items-center justify-center text-fuchsia-900 text-xs font-bold border border-fuchsia-300">
                        {(displayName || userEmail || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col leading-none text-left">
                      {isSuperadmin && (
                        <span className="rounded-full bg-fuchsia-900 text-fuchsia-100 px-1.5 py-0.5 text-xs font-semibold mb-0.5 self-start">
                          superadmin
                        </span>
                      )}
                      <span className="text-gray-600 text-sm">{displayName || userEmail}</span>
                    </div>
                  </button>

                  {/* Dropdown */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-fuchsia-100 hover:text-fuchsia-900 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.879 6.196 9 9 0 015.121 17.804z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Profile
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setDropdownOpen(false); handleLogout(); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* Fallback logout for small screens */}
                <button
                  onClick={handleLogout}
                  className="sm:hidden rounded-lg px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-600 hover:border-fuchsia-400 hover:text-fuchsia-800 transition-all duration-150"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  pathname === "/login"
                    ? "bg-fuchsia-800 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-fuchsia-400 hover:text-fuchsia-800"
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
