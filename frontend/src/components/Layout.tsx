import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMe, fetchDomains, fetchTeams, fetchAssets, fetchLayers } from "../api";
import SourceTypeIcon from "./SourceTypeIcon";

const ICONS = {
  home: "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  assets: "M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5",
  domains: "M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  teams: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-2.5-1.34",
  users: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  classification: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
};

const PALETTE = ["#0EA5E9", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#6366F1"];
function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function FolderGlyph({ color }: { color: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
    </svg>
  );
}

function PeopleGlyph({ color }: { color: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9" r="2.4" opacity="0.7" />
      <path d="M3 19a6 6 0 0 1 12 0v1H3v-1z" />
      <path d="M16 14.5a5 5 0 0 1 5 4.5v1h-4.2V19a7 7 0 0 0-1.4-4.2 5 5 0 0 1 .6-.3z" opacity="0.7" />
    </svg>
  );
}

function LayerGlyph({ color }: { color: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <rect x="4" y="5" width="16" height="4" rx="1" />
      <rect x="4" y="11" width="16" height="4" rx="1" opacity="0.7" />
      <rect x="4" y="17" width="16" height="3" rx="1" opacity="0.45" />
    </svg>
  );
}

type SubItem = { key: string; label: string; to: string; active: boolean; icon?: ReactNode };

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("datacat_token");
  const userEmail = localStorage.getItem("datacat_user_email");
  const isSuperadmin = localStorage.getItem("datacat_is_superadmin") === "true";

  const [avatar, setAvatar] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("datacat_sidebar_collapsed") === "true"
  );
  const menuRef = useRef<HTMLDivElement>(null);

  // Submenu data
  const { data: domains } = useQuery({ queryKey: ["domains"], queryFn: fetchDomains, enabled: !!token });
  const { data: teams } = useQuery({ queryKey: ["teams"], queryFn: fetchTeams, enabled: !!token });
  const { data: assets } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAssets(), enabled: !!token });
  const { data: layers } = useQuery({ queryKey: ["layers"], queryFn: fetchLayers, enabled: !!token });

  const sourceTypes = Array.from(
    new Set((assets ?? []).map((a) => a.source_type).filter(Boolean))
  ).sort();

  const activeSourceType = searchParams.get("source_type");
  const activeDomainId = searchParams.get("domain_id");
  const activeLayerId = searchParams.get("layer_id");

  useEffect(() => {
    if (!token) return;
    fetchMe()
      .then((u) => {
        setAvatar(u.avatar || "");
        setDisplayName(u.name || "");
      })
      .catch(() => {});
  }, [token, pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auto-open the section matching the current route
  useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      if (pathname.startsWith("/assets") && !activeLayerId) next.assets = true;
      if (pathname.startsWith("/domains")) next.domains = true;
      if (pathname.startsWith("/teams")) next.teams = true;
      if (pathname.startsWith("/classification") || (pathname === "/assets" && activeLayerId)) next.layers = true;
      return next;
    });
  }, [pathname, activeLayerId]);

  useEffect(() => {
    localStorage.setItem("datacat_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
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

  function toggle(key: string) {
    setOpen((p) => ({ ...p, [key]: !p[key] }));
  }

  function NavIcon({ icon, active }: { icon: string; active: boolean }) {
    return (
      <svg
        className={`w-5 h-5 flex-shrink-0 transition-colors ${
          active ? "text-fuchsia-600" : "text-gray-400 group-hover:text-gray-600"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d={icon} />
      </svg>
    );
  }

  function NavItem({ to, label, icon, mini }: { to: string; label: string; icon: string; mini: boolean }) {
    const active = pathname === to;
    return (
      <Link
        to={to}
        title={mini ? label : undefined}
        className={`group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors duration-150 ${
          mini ? "justify-center px-2" : "px-3"
        } ${
          active
            ? "bg-fuchsia-50 text-fuchsia-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        <NavIcon icon={icon} active={active} />
        {!mini && label}
      </Link>
    );
  }

  function NavAccordion({
    sectionKey,
    to,
    label,
    icon,
    items,
    emptyHint,
    mini,
  }: {
    sectionKey: string;
    to: string;
    label: string;
    icon: string;
    items: SubItem[];
    emptyHint: string;
    mini: boolean;
  }) {
    const sectionActive = pathname.startsWith(to);
    const isOpen = open[sectionKey] ?? false;

    if (mini) {
      return (
        <Link
          to={to}
          title={label}
          className={`group flex items-center justify-center rounded-lg px-2 py-2 transition-colors duration-150 ${
            sectionActive ? "bg-fuchsia-50" : "hover:bg-gray-100"
          }`}
        >
          <NavIcon icon={icon} active={sectionActive} />
        </Link>
      );
    }

    return (
      <div>
        <div
          className={`group flex items-center rounded-lg pr-1 transition-colors duration-150 ${
            sectionActive && pathname === to ? "bg-fuchsia-50" : "hover:bg-gray-100"
          }`}
        >
          <Link
            to={to}
            className={`flex flex-1 items-center gap-3 px-3 py-2 text-sm font-medium ${
              sectionActive ? "text-fuchsia-700" : "text-gray-600 group-hover:text-gray-900"
            }`}
          >
            <NavIcon icon={icon} active={sectionActive} />
            {label}
          </Link>
          <button
            onClick={() => toggle(sectionKey)}
            aria-label={`Toggle ${label}`}
            aria-expanded={isOpen}
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="mt-1 ml-[1.4rem] flex flex-col gap-0.5 border-l border-gray-200 pl-3">
            {items.length === 0 ? (
              <span className="px-2 py-1.5 text-xs text-gray-400">{emptyHint}</span>
            ) : (
              items.map((it) => (
                <Link
                  key={it.key}
                  to={it.to}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    it.active
                      ? "bg-fuchsia-50 font-medium text-fuchsia-700"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {it.icon}
                  <span className="truncate">{it.label}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  const sourceTypeItems: SubItem[] = sourceTypes.map((st) => ({
    key: st,
    label: st,
    to: `/assets?source_type=${encodeURIComponent(st)}`,
    active: pathname === "/assets" && activeSourceType === st,
    icon: <SourceTypeIcon type={st} className="w-4 h-4" />,
  }));

  const domainItems: SubItem[] = (domains ?? []).map((d) => ({
    key: d.id,
    label: d.name,
    to: `/assets?domain_id=${encodeURIComponent(d.id)}`,
    active: pathname === "/assets" && activeDomainId === d.id,
    icon: <FolderGlyph color={colorFor(d.name)} />,
  }));

  const teamItems: SubItem[] = (teams ?? []).map((t) => ({
    key: t.id,
    label: t.name,
    to: `/teams/${t.id}`,
    active: pathname === `/teams/${t.id}`,
    icon: <PeopleGlyph color={colorFor(t.name)} />,
  }));

  const layerItems: SubItem[] = (layers ?? []).map((l) => ({
    key: l.id,
    label: l.name,
    to: `/assets?layer_id=${encodeURIComponent(l.id)}`,
    active: pathname === "/assets" && activeLayerId === l.id,
    icon: <LayerGlyph color={l.color} />,
  }));

  function renderSidebar(mini: boolean, withToggle: boolean) {
    return (
      <div className="flex h-full flex-col">
        {/* Brand */}
        <Link to="/" className={`flex items-center gap-2 py-1 group ${mini ? "justify-center px-0" : "px-3"}`}>
          <div className="w-8 h-8 rounded-lg bg-fuchsia-800 flex items-center justify-center flex-shrink-0 group-hover:bg-fuchsia-900 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 13L7 7L10 13" />
              <path d="M14 13L17 7L20 13" />
              <path d="M4 13c0 1.1 3.58 2 8 2s8-.9 8-2s-3.58-2-8-2s-8 .9-8 2z" />
              <path d="M4 13v6c0 1.1 3.58 2 8 2s8-.9 8-2v-6" />
              <path d="M4 16.5c0 1.1 3.58 2 8 2s8-.9 8-2" />
            </svg>
          </div>
          {!mini && (
            <span className="font-display text-2xl font-black tracking-tight text-fuchsia-800 group-hover:text-fuchsia-900 transition-colors">
              datacat
            </span>
          )}
        </Link>

        {/* Nav */}
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          <NavItem to="/" label="Home" icon={ICONS.home} mini={mini} />
          <NavAccordion sectionKey="assets" to="/assets" label="Assets" icon={ICONS.assets} items={sourceTypeItems} emptyHint="No source types" mini={mini} />
          <NavAccordion sectionKey="domains" to="/domains" label="Domains" icon={ICONS.domains} items={domainItems} emptyHint="No domains" mini={mini} />
          <NavAccordion sectionKey="teams" to="/teams" label="Teams" icon={ICONS.teams} items={teamItems} emptyHint="No teams" mini={mini} />
          <NavAccordion sectionKey="layers" to="/classification" label="Data Classification" icon={ICONS.classification} items={layerItems} emptyHint="No layers" mini={mini} />

          {isSuperadmin && (
            <>
              {!mini && (
                <div className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Admin
                </div>
              )}
              {mini && <div className="my-2 mx-2 border-t border-gray-200" />}
              <NavItem to="/users" label="Users" icon={ICONS.users} mini={mini} />
            </>
          )}
        </nav>

        {/* Collapse toggle (desktop only) */}
        {withToggle && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={mini ? "Expand sidebar" : "Collapse sidebar"}
            className={`group mb-2 flex items-center gap-3 rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
              mini ? "justify-center px-2" : "px-3"
            }`}
          >
            <svg
              className={`w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-transform ${mini ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
            {!mini && "Collapse"}
          </button>
        )}

        {/* User menu pinned to bottom */}
        <div className="mt-2 border-t border-gray-200 pt-3">
          {token ? (
            <div ref={mini ? undefined : menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title={mini ? (displayName || userEmail || "") : undefined}
                className={`flex w-full items-center gap-2 rounded-lg py-2 hover:bg-gray-100 transition-colors duration-150 ${
                  mini ? "justify-center px-0" : "px-2"
                }`}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover border border-fuchsia-300 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-fuchsia-200 flex items-center justify-center text-fuchsia-900 text-xs font-bold border border-fuchsia-300 flex-shrink-0">
                    {(displayName || userEmail || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                {!mini && (
                  <>
                    <div className="flex flex-col leading-tight text-left min-w-0 flex-1">
                      {isSuperadmin && (
                        <span className="rounded-full bg-fuchsia-900 text-fuchsia-100 px-1.5 py-0.5 text-xs font-semibold mb-0.5 self-start">
                          superadmin
                        </span>
                      )}
                      <span className="text-gray-600 text-sm truncate">{displayName || userEmail}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>

              {menuOpen && (
                <div className={`absolute bottom-full mb-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 ${mini ? "left-0" : "left-0 right-0"}`}>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.879 6.196 9 9 0 015.121 17.804z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Profile
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
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
          ) : (
            <Link
              to="/login"
              title={mini ? "Login" : undefined}
              className={`flex items-center justify-center rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                mini ? "px-2" : "px-3"
              } ${
                pathname === "/login"
                  ? "bg-fuchsia-800 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-fuchsia-400 hover:text-fuchsia-800"
              }`}
            >
              {mini ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14M13 4h2a2 2 0 012 2v12a2 2 0 01-2 2h-2" />
                </svg>
              ) : (
                "Login"
              )}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-1.5 text-gray-600 hover:bg-fuchsia-100 hover:text-fuchsia-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-fuchsia-800 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 13L7 7L10 13" />
              <path d="M14 13L17 7L20 13" />
              <path d="M4 13c0 1.1 3.58 2 8 2s8-.9 8-2s-3.58-2-8-2s-8 .9-8 2z" />
              <path d="M4 13v6c0 1.1 3.58 2 8 2s8-.9 8-2v-6" />
              <path d="M4 16.5c0 1.1 3.58 2 8 2s8-.9 8-2" />
            </svg>
          </div>
          <span className="font-display text-xl font-black tracking-tight text-fuchsia-800">datacat</span>
        </Link>
      </header>

      {/* Desktop fixed sidebar */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 flex-col border-r border-gray-200 bg-white py-4 transition-all duration-200 ${
          collapsed ? "w-16 px-2" : "w-60 px-3"
        }`}
      >
        {renderSidebar(collapsed, true)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-white px-3 py-4 shadow-xl overflow-y-auto">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {renderSidebar(false, false)}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`transition-all duration-200 ${collapsed ? "md:pl-16" : "md:pl-60"}`}>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
